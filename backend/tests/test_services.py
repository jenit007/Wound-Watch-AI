import base64, io
import numpy as np
import pytest
from PIL import Image
from fastapi.testclient import TestClient
from app.main import app
from app.services.measurement import wound_area_px, area_px_to_cm2, mask_png_base64
from app.services.trajectory import analyze_trajectory
from app.preprocessing.images import load_rgb_image

def test_area_and_calibration():
    mask=np.array([[0,1],[1,1]],dtype=np.uint8)
    assert wound_area_px(mask)==3.0
    assert area_px_to_cm2(12,2)==3.0
    assert area_px_to_cm2(12,None) is None
    with pytest.raises(ValueError): area_px_to_cm2(12,0)

def test_mask_png_is_valid_base64_png():
    raw=base64.b64decode(mask_png_base64(np.array([[0,1],[1,0]])))
    assert Image.open(io.BytesIO(raw)).format=='PNG'

def test_trajectory_improving_and_irregular_dates():
    result=analyze_trajectory([{'visit_date':'2026-01-01','area_cm2':12},{'visit_date':'2026-01-05','area_cm2':10.5}])
    assert result['trajectory']=='improving'
    assert result['area_change_percent']==pytest.approx(-12.5)

def test_trajectory_insufficient_and_invalid_history():
    result=analyze_trajectory([{'visit_date':'bad','area_cm2':10}])
    assert result['trajectory']=='insufficient_data'

def test_image_validation():
    b=io.BytesIO(); Image.new('RGB',(8,8)).save(b,format='PNG')
    assert load_rgb_image(b.getvalue()).size==(8,8)
    with pytest.raises(ValueError): load_rgb_image(b'not an image')

def test_health_contract():
    client=TestClient(app)
    assert client.get('/health').json()=={'status':'ok'}

def test_analyze_unavailable_model_returns_contract(monkeypatch):
    class Unavailable:
        ready=False
    app_router=__import__('app.api.routes',fromlist=['router']).router
    monkeypatch.setattr(app_router,'segmentation_service',Unavailable(),raising=False)
    b=io.BytesIO(); Image.new('RGB',(8,8)).save(b,format='PNG')
    client=TestClient(app)
    response=client.post('/api/analyze',files={'image':('test.png',b.getvalue(),'image/png')},data={'clinical_data':'{}'})
    assert response.status_code==200
    body=response.json()
    assert set(['request_id','model_status','wound_area_px','wound_area_cm2','area_change_percent','trajectory','risk_level','risk_score','segmentation_mask_png_base64','explanation','warnings']).issubset(body)
    assert body['model_status']=='unavailable' and body['wound_area_px'] is None and body['segmentation_mask_png_base64'] is None

def test_analyze_rejects_malformed_clinical_json():
    b=io.BytesIO(); Image.new('RGB',(8,8)).save(b,format='PNG')
    response=TestClient(app).post('/api/analyze',files={'image':('test.png',b.getvalue(),'image/png')},data={'clinical_data':'{'})
    assert response.status_code==422

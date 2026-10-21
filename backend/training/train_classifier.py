"""Train an experimental tabular baseline from metadata.csv with a defined target.

This intentionally does not infer a target column. Supply --target explicitly and
exclude identifier columns from --features. The split is grouped by patient_id when present.
"""
import argparse, json
from pathlib import Path
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler, LabelEncoder
from sklearn.model_selection import GroupShuffleSplit, train_test_split
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix, mean_absolute_error, mean_squared_error, r2_score, roc_auc_score
import joblib

def main():
 p=argparse.ArgumentParser(); p.add_argument('--data',required=True); p.add_argument('--target',required=True); p.add_argument('--features',required=True,help='Comma-separated feature columns'); p.add_argument('--task',choices=['classification','regression'],default='classification'); p.add_argument('--output',default='artifacts/tabular_baseline.joblib'); args=p.parse_args()
 df=pd.read_csv(Path(args.data)/'metadata.csv'); features=[x.strip() for x in args.features.split(',') if x.strip()]
 if args.target not in df or any(f not in df for f in features): raise SystemExit('Target/features missing from metadata.csv.')
 if {'patient_id','filename'} & set(features): raise SystemExit('Do not train on patient_id or filename identifiers.')
 data=df[features+[args.target]+(['patient_id'] if 'patient_id' in df else [])].dropna(subset=[args.target]); X=data[features]; y=data[args.target]
 groups=data['patient_id'].astype(str) if 'patient_id' in data else None
 if groups is not None:
  tr,te=next(GroupShuffleSplit(n_splits=1,test_size=.2,random_state=42).split(X,y,groups)); Xtr,Xte=X.iloc[tr],X.iloc[te]; ytr,yte=y.iloc[tr],y.iloc[te]
 else: Xtr,Xte,ytr,yte=train_test_split(X,y,test_size=.2,random_state=42,stratify=y if args.task=='classification' else None)
 numeric=list(X.select_dtypes(include='number').columns); categorical=[c for c in features if c not in numeric]
 prep=ColumnTransformer([('num',Pipeline([('impute',SimpleImputer(strategy='median')),('scale',StandardScaler())]),numeric),('cat',Pipeline([('impute',SimpleImputer(strategy='most_frequent')),('encode',OneHotEncoder(handle_unknown='ignore'))]),categorical)])
 model=RandomForestClassifier(n_estimators=300,random_state=42,class_weight='balanced') if args.task=='classification' else RandomForestRegressor(n_estimators=300,random_state=42)
 pipe=Pipeline([('preprocess',prep),('model',model)]); pipe.fit(Xtr,ytr); pred=pipe.predict(Xte)
 if args.task=='classification':
  precision,recall,f1,_=precision_recall_fscore_support(yte,pred,average='weighted',zero_division=0); result={'task':args.task,'test_rows':len(yte),'accuracy':accuracy_score(yte,pred),'precision_weighted':precision,'recall_weighted':recall,'f1_weighted':f1,'confusion_matrix':confusion_matrix(yte,pred).tolist()}
  if yte.nunique()==2 and hasattr(pipe,'predict_proba'):
   try: result['roc_auc']=roc_auc_score(yte,pipe.predict_proba(Xte)[:,1])
   except ValueError: pass
 else:
  result={'task':args.task,'test_rows':len(yte),'mae':mean_absolute_error(yte,pred),'rmse':mean_squared_error(yte,pred)**.5,'r2':r2_score(yte,pred) if len(yte)>1 else None}
 result.update({'target':args.target,'features':features,'patient_group_split':groups is not None,'warning':'Experimental dataset-specific baseline; not a calibrated medical risk model.'})
 out=Path(args.output); out.parent.mkdir(parents=True,exist_ok=True); joblib.dump({'pipeline':pipe,'features':features,'target':args.target,'task':args.task},out); Path(str(out)+'.metrics.json').write_text(json.dumps(result,indent=2)); print(json.dumps(result,indent=2))
if __name__=='__main__': main()

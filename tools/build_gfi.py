#!/usr/bin/env python3
"""Build experimental monthly GFI from observed US public data, 2008 onward.
No interpolation, no synthetic measurements. Vintage revisions remain a limitation."""
import csv, io, json, math, pathlib, statistics, urllib.request
from bisect import bisect_right
from datetime import date, datetime, timedelta, timezone

IDS = ["BAMLH0A0HYM2","STLFSI4","DRCLACBS","VIXCLS","DEXUSEU","CPIAUCSL","UNRATE"]
def download(series):
    url = "https://fred.stlouisfed.org/graph/fredgraph.csv?id="+series+"&cosd=1997-01-01"
    req = urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0 (compatible; BreakfastIndex/1.0)"})
    with urllib.request.urlopen(req, timeout=45) as response:
        body=response.read().decode("utf-8-sig")
    reader=csv.DictReader(io.StringIO(body))
    if not reader.fieldnames or series not in reader.fieldnames:
        raise ValueError("Missing column "+series)
    timecol="DATE" if "DATE" in reader.fieldnames else "observation_date"
    out=[]
    for r in reader:
        try:
            v=float(r[series])
            if math.isfinite(v): out.append((date.fromisoformat(r[timecol]),v))
        except (ValueError,TypeError,KeyError): continue
    if len(out)<50: raise ValueError("Insufficient "+series+" history")
    return sorted(out)

data={key: download(key) for key in IDS}
def last(key, cutoff):
    rows=data[key]
    idx=bisect_right([r[0] for r in rows],cutoff)-1
    return rows[idx][1] if idx>=0 else None
def month_end(year,month):
    return (date(year+1,1,1) if month==12 else date(year,month+1,1))-timedelta(days=1)
def reading(asof):
    # Publication lags are deliberately conservative approximations; not historical vintages.
    d={}
    for key in IDS:
        lag=90 if key=="DRCLACBS" else 38 if key in ("CPIAUCSL","UNRATE") else 8
        d[key]=last(key,asof-timedelta(days=lag))
    earlier=asof-timedelta(days=365)
    d["inflation"]= 100*(d["CPIAUCSL"]/last("CPIAUCSL",earlier-timedelta(days=38))-1) if d["CPIAUCSL"] and last("CPIAUCSL",earlier-timedelta(days=38)) else None
    fxold=last("DEXUSEU",asof-timedelta(days=100))
    d["fxshock"]=abs(100*(d["DEXUSEU"]/fxold-1)) if d["DEXUSEU"] and fxold else None
    jobold=last("UNRATE",asof-timedelta(days=130))
    d["jobshock"]=max(0,d["UNRATE"]-jobold) if d["UNRATE"] is not None and jobold is not None else None
    return d
def rank(history,value):
    if value is None or len(history)<24:return None
    return round(100*(sum(x<value for x in history)+.5*sum(x==value for x in history))/len(history),1)

months=[]
for year in range(1999,datetime.now(timezone.utc).year+1):
    for month in range(1,13):
        d=month_end(year,month)
        if d>date.today():break
        months.append((d,reading(d)))
series={"credit":("BAMLH0A0HYM2",20),"liquidity":("STLFSI4",20),"consumer":("DRCLACBS",15),"volatility":("VIXCLS",15),"currency":("fxshock",10),"inflation":("inflation",10),"employment":("jobshock",5)}
points=[]
for i,(d,row) in enumerate(months):
    if d<date(2008,1,1):continue
    scores={}
    for name,(key,weight) in series.items():
        prior=[r[key] for _,r in months[max(0,i-120):i] if r[key] is not None]
        scores[name]=rank(prior,row[key])
    good=[(name,value,series[name][1]) for name,value in scores.items() if value is not None]
    coverage=sum(weight for _,_,weight in good)
    if coverage<70:continue
    overall=round(sum(value*weight for _,value,weight in good)/coverage,1)
    def sub(names):
        group=[(scores[n],series[n][1]) for n in names if scores[n] is not None]
        return round(sum(v*w for v,w in group)/sum(w for _,w in group),1) if group else None
    points.append({"date":d.isoformat(),"gfi":overall,"financial":sub(["credit","liquidity","volatility","currency"]),"household":sub(["consumer","inflation","employment"]),"coverage":coverage,"scores":scores})
if len(points)<180 or points[0]["date"][:4]!="2008":
    raise RuntimeError("2008-to-present history incomplete. No data published.")
result={"version":"0.3-research","updated_utc":datetime.now(timezone.utc).isoformat(),"method":"Trailing 120-month empirical stress percentiles, weighted, normalized over available categories; not a real-time or vintage-correct backtest.","missing":"Global market breadth and cross-border contagion not yet independently implemented; VIX is only a US volatility proxy.","series":{k:{"source":v[0],"weight":v[1]} for k,v in series.items()},"points":points}
dest=pathlib.Path("data/gfi.json")
dest.parent.mkdir(parents=True,exist_ok=True)
dest.write_text(json.dumps(result,separators=(",",":"))+"\n",encoding="utf-8")
print("Generated",len(points),"GFI observations from",points[0]["date"],"to",points[-1]["date"])

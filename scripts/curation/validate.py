"""Usage: python3 validate.py drafts/<file>.json   -> checks every draft against the walking + place rules."""
import json,math,sys,re,os
pool={p["id"]:p for p in json.load(open("pool.json"))}
def walk(a,b):
    R=3958.8;la1,lo1,la2,lo2=map(math.radians,[a["lat"],a["lng"],b["lat"],b["lng"]])
    h=math.sin((la2-la1)/2)**2+math.cos(la1)*math.cos(la2)*math.sin((lo2-lo1)/2)**2
    return 2*R*math.asin(math.sqrt(h))*1.25
def check(dft,event=False):
    errs=[];ids=dft.get("places_id",[])
    for i in ids:
        if i not in pool: errs.append(f"place {i} not in pool (closed, no photos or unknown)")
    if errs: return errs,None
    legs=[round(walk(pool[ids[i]],pool[ids[i+1]]),2) for i in range(len(ids)-1)]
    clusters=dft.get("clusters")  # marathon only: list of index lists
    if not event:
        if not 3<=len(ids)<=4: errs.append(f"{len(ids)} stops (need 3 to 4)")
        if any(l>0.7 for l in legs): errs.append(f"leg over 0.7 mi: {legs}")
        if sum(legs)>1.6: errs.append(f"total walk {sum(legs):.2f} mi (aim ~1.5)")
    if len(set(ids))!=len(ids) and not event: errs.append("repeated place")
    text=" ".join([dft.get("title",""),dft.get("description","")]+[s.get("note","") for s in dft.get("stops",[])])
    if re.search(r"[–—]| - |--",text): errs.append("dash in text (style rule)")
    for s in dft.get("stops",[]):
        b=s.get("backup_place_id")
        if b is not None and b in pool and walk(pool[b],pool[s["place_id"]])>0.5: errs.append(f"backup {b} is >0.5 mi from its stop")
    return errs,legs
if __name__=="__main__":
    data=json.load(open(sys.argv[1])); bad=0
    for dft in data:
        errs,legs=check(dft,dft.get("type")=="event")
        print(("FAIL " if errs else "ok   ")+dft.get("title","?"),legs,"; ".join(errs)); bad+=bool(errs)
    print(f"{len(data)-bad}/{len(data)} pass")

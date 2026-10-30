import os,json,urllib.request,urllib.error,time
B="https://xupl-quzd-sk5c.n7e.xano.io/api:meta/workspace/1"
H={"Authorization":"Bearer "+os.environ["XANO_METADATA_TOKEN"],"Content-Type":"application/json"}
def call(method,path,body=None):
    for i in range(4):
        try:
            r=urllib.request.Request(B+path,data=None if body is None else json.dumps(body).encode(),headers=H,method=method)
            raw=urllib.request.urlopen(r,timeout=90).read()
            return json.loads(raw) if raw else None
        except urllib.error.HTTPError as e:
            if e.code==404 and method=="DELETE" and i>0: return None  # retried delete already landed
            if e.code==429 or e.code>=500: time.sleep(2**i); continue
            raise RuntimeError(f"{method} {path} -> {e.code} {e.read()[:300]}")
        except (urllib.error.URLError,ConnectionError,TimeoutError):
            time.sleep(2**i+1)
    raise RuntimeError("retries exhausted")
def bulk_patch(table,items):
    out={"success":[],"error":[]}
    for i in range(0,len(items),50):
        r=call("POST",f"/table/{table}/content/bulk/patch",{"items":items[i:i+50]})
        out["success"]+=r.get("success",[]); out["error"]+=r.get("error",[])
    return out

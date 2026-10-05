"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
type Result={title:string;subtitle:string;href:string};
export function SearchResults({q,scope}:{q:string;scope:string}){
 const [results,setResults]=useState<Result[]>([]);const [error,setError]=useState(false);const [loadedKey,setLoadedKey]=useState("");const key=`${scope}:${q}`;
 useEffect(()=>{let alive=true;fetch(`/api/search?q=${encodeURIComponent(q)}&in=${encodeURIComponent(scope)}&all=1`).then(async r=>{if(!r.ok)throw new Error();return r.json();}).then(d=>{if(alive){setResults(d.results??[]);setLoadedKey(key);setError(false);}}).catch(()=>{if(alive){setError(true);setLoadedKey(key);}});return()=>{alive=false;};},[q,scope,key]);
 const loading=loadedKey!==key;
 return <section className="search-page-results"><h2>{scope[0]?.toUpperCase()+scope.slice(1)} results <span>{results.length}</span></h2>{loading?<div className="search-loading"><i/><i/><i/></div>:error?<p role="alert">Search is unavailable right now.</p>:results.length?<div className="search-results-list">{results.map((r,i)=><Link key={`${r.href}${i}`} href={r.href}><b>{r.title}</b><span>{r.subtitle}</span><i>→</i></Link>)}</div>:<p>No results for “{q}”.</p>}</section>;
}

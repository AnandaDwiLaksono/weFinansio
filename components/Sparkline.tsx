"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";

export default function Sparkline({ data }:{ data: {date:string; value:number}[] }) {
  return (
    <div className="h-8 w-24">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <YAxis hide domain={["dataMin","dataMax"]} />
          <Tooltip formatter={(v:number)=>format(v)} labelFormatter={(l)=>l} />
          <Line type="monotone" dataKey="value" dot={false} strokeWidth={1.5} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
function format(n:number){
  return new Intl.NumberFormat("id-ID", { style:"currency", currency:"IDR", maximumFractionDigits:0 }).format(n||0);
}

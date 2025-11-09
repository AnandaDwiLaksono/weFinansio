"use client";
import { PieChart, Pie, Tooltip, Cell, ResponsiveContainer } from "recharts";

export default function BudgetDonut({ items }: { items: { categoryName:string; spent:number }[] }) {
  const data = items
    .filter(i => i.spent > 0)
    .map(i => ({ name: i.categoryName, value: i.spent }))
    .sort((a,b)=> b.value - a.value)
    .slice(0, 8); // top 8

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} />
          <Tooltip formatter={(v:number)=> new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(v)} />
          {data.map((_, i) => <Cell key={i} />)}
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

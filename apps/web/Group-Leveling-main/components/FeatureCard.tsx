import React from 'react';

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}

export default function FeatureCard({ icon, title, description, color }: FeatureCardProps) {
  return (
    <article className={`${color} p-10 rounded-[2.5rem] space-y-4 hover:translate-y-[-5px] transition-all border border-transparent hover:border-white shadow-sm group`}>
      <div className="bg-white w-16 h-16 rounded-2xl shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-2xl font-bold text-slate-800">{title}</h3>
      <p className="text-lg text-slate-600 leading-relaxed">{description}</p>
    </article>
  );
}

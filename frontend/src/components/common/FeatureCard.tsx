import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';

interface FeatureCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  color: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ 
  title, 
  description, 
  icon, 
  path,
  color 
}) => {
  const navigate = useNavigate();
  
  return (
    <div 
      className="card cursor-pointer group shadow-sm hover:shadow-md transition-shadow"
      onClick={() => navigate(path)}
      role="button"
      aria-label={`Navigate to ${title}`}
    >
      <div className={`p-6 ${color}`}>
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-white">{title}</h3>
          <div className="text-white opacity-80 group-hover:opacity-100 transition-opacity">
            {icon}
          </div>
        </div>
        <p className="mt-2 text-white text-opacity-90 text-sm">{description}</p>
      </div>
      <div className="p-4 bg-white">
        <div className="text-right">
          <span className="text-sm font-medium text-primary-600 group-hover:underline">
            Open {title}
          </span>
        </div>
      </div>
    </div>
  );
};

export default FeatureCard;
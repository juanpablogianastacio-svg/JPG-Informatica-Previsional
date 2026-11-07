import { Landmark } from 'lucide-react';

export default function AppLogo({ size = 36 }) {
  return (
    <div className="app-logo" style={{ width: size, height: size }} aria-hidden="true">
      <Landmark size={Math.round(size * 0.55)} strokeWidth={2} />
    </div>
  );
}

import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import EmptyState from '../components/ui/EmptyState.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';

export default function NotFound() {
  useDocumentTitle('Page not found');
  return (
    <div className="card mx-auto mt-10 max-w-lg">
      <EmptyState
        icon={Compass}
        title="Page not found"
        message="The page you were looking for does not exist. Use the navigation or go back to the overview."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Link to="/dashboard" className="btn-primary">
              Go to overview
            </Link>
            <Link to="/" className="btn-secondary">
              Homepage
            </Link>
          </div>
        }
      />
    </div>
  );
}

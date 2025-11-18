import React, { useState, useEffect, createContext, useContext } from 'react';
import { LayoutGrid, Wrench, Menu } from 'lucide-react';
import { APP_NAME } from '../constants';

// --- Minimal Router Implementation ---

const RouterContext = createContext<{ path: string; navigate: (path: string) => void }>({
  path: '/',
  navigate: () => {},
});

export const useLocation = () => {
  const context = useContext(RouterContext);
  return { pathname: context.path };
};

export const useNavigate = () => {
  const context = useContext(RouterContext);
  return context.navigate;
};

export const HashRouter: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Normalize path: remove query string, remove trailing slash (unless root)
  const normalizePath = (hash: string) => {
    let path = hash.slice(1); // Remove '#'
    if (path.includes('?')) path = path.split('?')[0]; // Remove query params
    if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1); // Remove trailing slash
    return path || '/';
  };

  const [path, setPath] = useState(normalizePath(window.location.hash));

  useEffect(() => {
    const handleHashChange = () => {
      setPath(normalizePath(window.location.hash));
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = (newPath: string) => {
    window.location.hash = newPath;
  };

  return (
    <RouterContext.Provider value={{ path, navigate }}>
      {children}
    </RouterContext.Provider>
  );
};

export const Link: React.FC<{ to: string; children: React.ReactNode; className?: string; onClick?: () => void }> = ({ to, children, className, onClick }) => {
  const { navigate } = useContext(RouterContext);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    navigate(to);
    if (onClick) onClick();
  };

  return (
    <a 
      href={`#${to}`} 
      className={className} 
      onClick={handleClick}
    >
      {children}
    </a>
  );
};

export const Navigate: React.FC<{ to: string; replace?: boolean }> = ({ to }) => {
  const { navigate } = useContext(RouterContext);
  useEffect(() => {
    navigate(to);
  }, [to, navigate]);
  return null;
};

export const Routes: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { path: currentPath } = useContext(RouterContext);
  
  let match: React.ReactNode = null;
  let fallback: React.ReactNode = null;

  // Convert children to array to safely iterate even if single child
  const routes = React.Children.toArray(children);

  for (const child of routes) {
    if (!React.isValidElement(child)) continue;
    
    const props = child.props as { path?: string; element?: React.ReactNode };
    const routePath = props.path;

    // Exact match
    if (routePath === currentPath) {
      match = child;
      break;
    }
    
    // Wildcard fallback
    if (routePath === '*') {
      fallback = child;
    }
  }

  return <>{match || fallback}</>;
};

export const Route: React.FC<{ path: string; element: React.ReactNode }> = ({ element }) => {
  return <>{element}</>;
};

// --- Layout Component ---

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-200 selection:bg-indigo-500/30">
      {/* Background decorative blobs */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl opacity-30 animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-violet-500/10 rounded-full blur-3xl opacity-30 animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-slate-950/70 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <span className="font-bold text-white">D</span>
              </div>
              <span className="text-lg font-semibold tracking-tight text-white">{APP_NAME}</span>
            </div>
            
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <Link
                  to="/"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center gap-2 ${
                    isActive('/') 
                      ? 'bg-white/10 text-white' 
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <LayoutGrid size={18} />
                  Dashboard
                </Link>
                <Link
                  to="/tools"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center gap-2 ${
                    isActive('/tools') 
                      ? 'bg-white/10 text-white' 
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Wrench size={18} />
                  Workshop
                </Link>
              </div>
            </div>

            <div className="-mr-2 flex md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-slate-400 hover:text-white hover:bg-white/10 focus:outline-none"
              >
                <Menu size={24} />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-white/5 bg-slate-950">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              <Link
                to="/"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-white/10"
              >
                Dashboard
              </Link>
              <Link
                to="/tools"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-slate-400 hover:text-white hover:bg-white/10"
              >
                Workshop
              </Link>
            </div>
          </div>
        )}
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      <footer className="border-t border-white/5 mt-12 py-8">
         <div className="max-w-7xl mx-auto px-4 text-center text-slate-600 text-sm">
            <p>&copy; {new Date().getFullYear()} {APP_NAME} Environment. Self-hosted with ♥.</p>
         </div>
      </footer>
    </div>
  );
};

export default Layout;
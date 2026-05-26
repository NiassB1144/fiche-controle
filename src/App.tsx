import { useEffect } from 'react';
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { initOfflineManager } from "@/lib/offline-sync";
import { SyncIndicator, OfflineNotice } from "@/components/sync-indicator";

const queryClient = new QueryClient();

function Home() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">Fiche Contrôle</h1>
        <p className="mt-2 text-sm text-gray-600">Application de gestion des fiches de contrôle</p>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Initialiser le mode offline au démarrage
  useEffect(() => {
    initOfflineManager({
      enableOffline: true,
      enableServiceWorker: true,
      syncInterval: 60000, // 1 minute
    });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          {/* Indicateur de synchronisation */}
          <SyncIndicator position="top" showDetails={false} />
          
          {/* Notification offline */}
          <OfflineNotice />
          
          {/* Contenu principal */}
          <div className="pt-12">
            <Router />
          </div>
          
          <Toaster />
        </WouterRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

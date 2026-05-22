class ServiceWorkerHeaderMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        
        # Service Worker: doit être revalidé constamment pour détecter les mises à jour
        if request.path == '/static/js/sw.js' or request.path == '/sw.js':
            response['Service-Worker-Allowed'] = '/'
            # Cache-Control: no-cache = télécharge toujours, mais utilise l'ETag/Last-Modified pour vérifier
            response['Cache-Control'] = 'public, max-age=0, must-revalidate'
            # Permet au navigateur de vérifier rapidement si une nouvelle version existe
            
        # Offline.html aussi doit toujours être à jour
        elif request.path == '/offline.html':
            response['Cache-Control'] = 'public, max-age=3600, must-revalidate'
            
        return response

"""
API endpoints pour la synchronisation offline
"""
import json
from datetime import datetime
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from django.db import transaction
from .models import FicheControle
import logging

logger = logging.getLogger(__name__)

# Champs de FicheControle
BOOL_FIELDS = [
    'remuneration_au_temps_1', 'remuneration_au_temps_2',
    'remuneration_a_la_piece_1', 'remuneration_a_la_piece_2',
    'remuneration_les_deux_1', 'remuneration_les_deux_2',
    'suite_observations_orales', 'suite_observations_ecrites',
    'suite_mise_en_demeure', 'suite_pv_infraction', 'suite_refere',
    'delai_reception', 'delai_un_mois', 'delai_autres',
]

INT_FIELDS = [
    'cadres_hommes', 'cadres_femmes', 'ouvriers_hommes', 'ouvriers_femmes',
    'cdi', 'cdd', 'cs', 'c_app', 'autres_contrats',
]

DATE_FIELDS = ['date_controle', 'date_ouverture']


def _serialize_fiche(fiche):
    """Sérialise une FicheControle en dictionnaire"""
    data = {}
    for field in fiche._meta.get_fields():
        fname = field.name
        if fname in ('id', 'inspecteur'):
            continue
        
        value = getattr(fiche, fname, None)
        
        # Gérer les dates
        if isinstance(value, datetime):
            value = value.isoformat()
        elif hasattr(value, 'isoformat'):  # date objects
            value = value.isoformat()
        
        data[fname] = value
    
    data['id'] = fiche.id
    return data


def _deserialize_fiche(data, inspecteur):
    """Désérialise un dictionnaire en FicheControle"""
    fiche = FicheControle(inspecteur=inspecteur)
    
    for field in FicheControle._meta.get_fields():
        fname = field.name
        if fname in ('id', 'inspecteur', 'created_at', 'updated_at'):
            continue
        
        if fname not in data:
            continue
        
        value = data[fname]
        
        # Gérer les types
        if fname in BOOL_FIELDS:
            setattr(fiche, fname, value in (True, 'true', '1', 'on'))
        elif fname in INT_FIELDS:
            try:
                setattr(fiche, fname, int(value) if value not in ('', None) else 0)
            except (ValueError, TypeError):
                setattr(fiche, fname, 0)
        elif fname in DATE_FIELDS:
            if value and value != '':
                try:
                    if isinstance(value, str):
                        from datetime import datetime
                        value = datetime.strptime(value.split('T')[0], '%Y-%m-%d').date()
                    setattr(fiche, fname, value)
                except (ValueError, TypeError):
                    if fname == 'date_controle':
                        from datetime import date
                        setattr(fiche, fname, date.today())
        else:
            setattr(fiche, fname, value or '')
    
    return fiche


@csrf_exempt
@require_http_methods(["POST"])
def sync_endpoint(request):
    """
    Endpoint pour la synchronisation offline
    POST /api/sync/
    
    Body:
    {
        "action": "save" | "delete" | "update",
        "data": { fiche data }
    }
    """
    try:
        body = json.loads(request.body)
        action = body.get('action')
        data = body.get('data', {})
        
        if action == 'save':
            return handle_save(request, data)
        elif action == 'delete':
            return handle_delete(request, data)
        elif action == 'update':
            return handle_update(request, data)
        else:
            return JsonResponse({
                'error': 'invalid_action',
                'message': f'Action inconnue: {action}'
            }, status=400)
    
    except json.JSONDecodeError:
        return JsonResponse({
            'error': 'invalid_json',
            'message': 'JSON invalide'
        }, status=400)
    except Exception as e:
        logger.exception('Erreur sync:')
        return JsonResponse({
            'error': 'server_error',
            'message': str(e)
        }, status=500)


def handle_save(request, data):
    """Sauvegarder une fiche"""
    fiche_id = data.get('id')
    local_id = data.get('local_id')
    
    # Obtenir l'utilisateur (si authentifié) ou anonyme
    inspecteur = request.user if request.user.is_authenticated else None
    
    try:
        with transaction.atomic():
            if fiche_id:
                # Mise à jour
                fiche = FicheControle.objects.get(id=fiche_id)
                if inspecteur and fiche.inspecteur != inspecteur:
                    return JsonResponse({
                        'error': 'forbidden',
                        'message': 'Vous n\'avez pas le droit de modifier cette fiche'
                    }, status=403)
            else:
                # Création
                fiche = FicheControle(inspecteur=inspecteur)
            
            # Mettre à jour les champs
            for field in FicheControle._meta.get_fields():
                fname = field.name
                if fname in ('id', 'inspecteur', 'created_at', 'updated_at', 'local_id'):
                    continue
                
                if fname not in data:
                    continue
                
                value = data[fname]
                
                # Gérer les types
                if fname in BOOL_FIELDS:
                    setattr(fiche, fname, value in (True, 'true', '1', 'on'))
                elif fname in INT_FIELDS:
                    try:
                        setattr(fiche, fname, int(value) if value not in ('', None) else 0)
                    except (ValueError, TypeError):
                        setattr(fiche, fname, 0)
                elif fname in DATE_FIELDS:
                    if value and value != '':
                        try:
                            if isinstance(value, str):
                                from datetime import datetime
                                value = datetime.strptime(value.split('T')[0], '%Y-%m-%d').date()
                            setattr(fiche, fname, value)
                        except (ValueError, TypeError):
                            if fname == 'date_controle':
                                from datetime import date
                                setattr(fiche, fname, date.today())
                else:
                    setattr(fiche, fname, value or '')
            
            # Sauvegarder
            fiche.save()
            
            return JsonResponse({
                'success': True,
                'id': fiche.id,
                'local_id': local_id,
                'data': _serialize_fiche(fiche)
            }, status=201)
    
    except FicheControle.DoesNotExist:
        return JsonResponse({
            'error': 'not_found',
            'message': f'Fiche {fiche_id} non trouvée'
        }, status=404)
    except Exception as e:
        logger.exception('Erreur save:')
        return JsonResponse({
            'error': 'server_error',
            'message': str(e)
        }, status=500)


def handle_delete(request, data):
    """Supprimer une fiche"""
    fiche_id = data.get('id')
    
    if not fiche_id:
        return JsonResponse({
            'error': 'missing_id',
            'message': 'ID manquant'
        }, status=400)
    
    try:
        fiche = FicheControle.objects.get(id=fiche_id)
        
        # Vérifier les permissions
        if request.user.is_authenticated and fiche.inspecteur != request.user:
            return JsonResponse({
                'error': 'forbidden',
                'message': 'Vous n\'avez pas le droit de supprimer cette fiche'
            }, status=403)
        
        fiche.delete()
        
        return JsonResponse({
            'success': True,
            'id': fiche_id
        }, status=200)
    
    except FicheControle.DoesNotExist:
        return JsonResponse({
            'error': 'not_found',
            'message': f'Fiche {fiche_id} non trouvée'
        }, status=404)
    except Exception as e:
        logger.exception('Erreur delete:')
        return JsonResponse({
            'error': 'server_error',
            'message': str(e)
        }, status=500)


def handle_update(request, data):
    """Mettre à jour une fiche (équivalent à save)"""
    return handle_save(request, data)


@require_http_methods(["GET"])
def get_fiches(request):
    """
    Obtenir la liste des fiches
    GET /api/fiches/?inspecteur=ID
    """
    inspecteur = request.GET.get('inspecteur')
    
    try:
        if inspecteur:
            fiches = FicheControle.objects.filter(inspecteur_id=inspecteur)
        else:
            fiches = FicheControle.objects.all()
        
        return JsonResponse({
            'success': True,
            'data': [_serialize_fiche(f) for f in fiches]
        }, status=200)
    
    except Exception as e:
        logger.exception('Erreur get_fiches:')
        return JsonResponse({
            'error': 'server_error',
            'message': str(e)
        }, status=500)


@require_http_methods(["GET"])
def get_fiche(request, fiche_id):
    """
    Obtenir une fiche spécifique
    GET /api/fiches/<id>/
    """
    try:
        fiche = FicheControle.objects.get(id=fiche_id)
        
        return JsonResponse({
            'success': True,
            'data': _serialize_fiche(fiche)
        }, status=200)
    
    except FicheControle.DoesNotExist:
        return JsonResponse({
            'error': 'not_found',
            'message': f'Fiche {fiche_id} non trouvée'
        }, status=404)
    except Exception as e:
        logger.exception('Erreur get_fiche:')
        return JsonResponse({
            'error': 'server_error',
            'message': str(e)
        }, status=500)


@require_http_methods(["GET"])
def get_local_fiche(request, local_id):
    """
    Obtenir une fiche locale (créée offline, non synchronisée)
    GET /api/local/<local_id>/
    Retourne les données depuis IndexedDB du navigateur
    Note: Cette requête est faite par le script offline pour récupérer
    les données depuis le cache local du navigateur
    """
    # Cette route est principalement pour validation
    # Les données réelles viennent du client
    return JsonResponse({
        'success': True,
        'message': 'Fiche locale - données serveur indisponibles',
        'local_id': local_id,
        'synced': False
    }, status=200)


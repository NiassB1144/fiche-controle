// ========================================================================
// OFFLINE DETAIL - Gestion des détails d'une fiche hors ligne
// Version complète et corrigée
// ========================================================================

const DETAIL_DB_NAME = 'ficheControleDB';
const DETAIL_DB_VERSION = 6;
const DETAIL_STORE = 'fiches_locales';

async function openDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DETAIL_DB_NAME, DETAIL_DB_VERSION);
        req.onerror = () => reject(req.error);
        req.onsuccess = () => resolve(req.target.result);
    });
}

async function getFicheFromDB(localId) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(DETAIL_STORE, 'readonly');
        const req = tx.objectStore(DETAIL_STORE).get(parseInt(localId));
        req.onerror = () => reject(req.error);
        req.onsuccess = () => resolve(req.result);
    });
}

async function deleteFicheFromDB(localId) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(DETAIL_STORE, 'readwrite');
        const req = tx.objectStore(DETAIL_STORE).delete(parseInt(localId));
        req.onerror = () => reject(req.error);
        req.onsuccess = () => resolve();
    });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('fr-FR');
    } catch {
        return dateStr;
    }
}

async function loadFiche() {
    const localId = window.localFicheId;
    if (!localId) {
        document.getElementById('fiche-content').innerHTML = '<div class="alert alert-danger">ID de fiche manquant</div>';
        return;
    }
    
    try {
        const fiche = await getFicheFromDB(localId);
        if (!fiche) {
            document.getElementById('fiche-content').innerHTML = '<div class="alert alert-danger">Fiche non trouvée</div>';
            return;
        }
        
        window.currentFiche = fiche;
        renderFiche(fiche);
    } catch (error) {
        console.error('Erreur chargement:', error);
        document.getElementById('fiche-content').innerHTML = `<div class="alert alert-danger">Erreur: ${escapeHtml(error.message)}</div>`;
    }
}

function renderFiche(fiche) {
    const titleEl = document.getElementById('fiche-titre');
    if (titleEl) {
        titleEl.textContent = fiche.entreprise || 'Fiche sans nom';
    }
    
    const container = document.getElementById('fiche-content');
    if (!container) return;
    
    // Champs à afficher (ordre et libellés)
    const fields = [
        { label: 'Entreprise', key: 'entreprise' },
        { label: 'Lieu', key: 'lieu' },
        { label: 'Adresse', key: 'adresse' },
        { label: 'Téléphone', key: 'telephone' },
        { label: 'Email', key: 'email_entreprise' },
        { label: 'Date de contrôle', key: 'date_controle', formatter: formatDate },
        { label: 'Statut', key: 'statut', formatter: (v) => v === 'soumis' ? 'Soumis' : 'Brouillon' },
        { label: 'Observations', key: 'observations_generales' },
        { label: 'Chef d\'établissement', key: 'chef_nom' },
        { label: 'Email chef', key: 'chef_email' },
        { label: 'Téléphone chef', key: 'chef_cellulaire' }
    ];
    
    let html = '<div class="fiche-fields">';
    for (const field of fields) {
        let value = fiche[field.key];
        if (value && value !== '') {
            if (field.formatter) {
                value = field.formatter(value);
            }
            html += `
                <div class="fiche-field mb-3">
                    <div class="fiche-label fw-bold text-secondary mb-1">${field.label}</div>
                    <div class="fiche-value p-2 bg-light rounded">${escapeHtml(String(value))}</div>
                </div>
            `;
        }
    }
    html += '</div>';
    
    // Ajouter les effectifs si présents
    if (fiche.cadres_hommes || fiche.cadres_femmes || fiche.ouvriers_hommes || fiche.ouvriers_femmes) {
        html += '<h6 class="mt-4 mb-3">Effectifs</h6><div class="row g-2">';
        html += `<div class="col-6"><div class="p-2 bg-light rounded small">Cadres: ${parseInt(fiche.cadres_hommes || 0) + parseInt(fiche.cadres_femmes || 0)}</div></div>`;
        html += `<div class="col-6"><div class="p-2 bg-light rounded small">Ouvriers: ${parseInt(fiche.ouvriers_hommes || 0) + parseInt(fiche.ouvriers_femmes || 0)}</div></div>`;
        html += '</div>';
    }
    
    // Ajouter le statut de synchronisation
    const syncStatus = fiche.synced ? 'Synchronisée' : 'En attente de synchronisation';
    const syncIcon = fiche.synced ? 'bi-cloud-check' : 'bi-cloud-arrow-up';
    const syncColor = fiche.synced ? 'text-success' : 'text-warning';
    
    html += `
        <hr class="my-4">
        <div class="small ${syncColor}">
            <i class="bi ${syncIcon}"></i> ${syncStatus}
            ${fiche.saved_at ? `<br><i class="bi bi-clock"></i> Sauvegardée le: ${new Date(fiche.saved_at).toLocaleString('fr-FR')}` : ''}
        </div>
    `;
    
    container.innerHTML = html;
}

function editFiche() {
    if (!window.currentFiche) return;
    window.location.href = `/inspection/fiche/local/${window.localFicheId}/edit/`;
}

async function deleteFiche() {
    if (!confirm('Supprimer définitivement cette fiche ? Cette action est irréversible.')) return;
    
    try {
        await deleteFicheFromDB(window.localFicheId);
        
        // Appeler la sync si en ligne pour supprimer côté serveur
        if (navigator.onLine && window.currentFiche && window.currentFiche.server_pk) {
            try {
                const csrfToken = getCsrfToken();
                await fetch(`/api/fiche/${window.currentFiche.server_pk}/supprimer/`, {
                    method: 'DELETE',
                    headers: { 'X-CSRFToken': csrfToken }
                });
            } catch (e) {
                console.warn('Erreur suppression serveur (sera synchronisé plus tard):', e);
            }
        }
        
        alert('Fiche supprimée avec succès !');
        window.location.href = '/inspection/fiches/';
    } catch (error) {
        alert('Erreur lors de la suppression: ' + error.message);
    }
}

async function syncNow() {
    if (!navigator.onLine) {
        alert('Vous êtes hors ligne. La synchronisation sera faite automatiquement quand la connexion reviendra.');
        return;
    }
    
    const btn = document.getElementById('sync-btn');
    const originalText = btn ? btn.innerHTML : '';
    
    if (btn) {
        btn.innerHTML = '<i class="bi bi-arrow-repeat spinner"></i> Synchronisation...';
        btn.disabled = true;
    }
    
    try {
        if (window.FicheApp && window.FicheApp.syncAll) {
            const result = await window.FicheApp.syncAll();
            alert(`Synchronisation terminée: ${result.synced} fiche(s) synchronisée(s), ${result.failed} échec(s)`);
        } else if (window.syncAll) {
            const result = await window.syncAll();
            alert(`Synchronisation terminée: ${result.synced} fiche(s) synchronisée(s), ${result.failed} échec(s)`);
        } else {
            alert('Fonction de synchronisation non disponible');
        }
        
        // Recharger la fiche pour mettre à jour le statut
        await loadFiche();
    } catch (error) {
        alert('Erreur lors de la synchronisation: ' + error.message);
    } finally {
        if (btn) {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }
}

function getCsrfToken() {
    const cookie = document.cookie.split('; ').find(row => row.startsWith('csrftoken='));
    if (cookie) return cookie.split('=')[1];
    const meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? meta.getAttribute('content') : '';
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    const match = path.match(/\/inspection\/fiche\/local\/(\d+)\//);
    if (match) {
        window.localFicheId = parseInt(match[1]);
    }
    
    loadFiche();
    
    const editBtn = document.getElementById('edit-btn');
    const deleteBtn = document.getElementById('delete-btn');
    const syncBtn = document.getElementById('sync-btn');
    
    if (editBtn) editBtn.addEventListener('click', editFiche);
    if (deleteBtn) deleteBtn.addEventListener('click', deleteFiche);
    if (syncBtn) syncBtn.addEventListener('click', syncNow);
});

console.log('[OfflineDetail] Script chargé');
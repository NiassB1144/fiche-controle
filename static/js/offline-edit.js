// ========================================================================
// OFFLINE EDIT - Modification d'une fiche hors ligne
// Version complète et corrigée
// ========================================================================

const EDIT_DB_NAME = 'ficheControleDB';
const EDIT_DB_VERSION = 6;
const EDIT_STORE = 'fiches_locales';

async function openDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(EDIT_DB_NAME, EDIT_DB_VERSION);
        req.onerror = () => reject(req.error);
        req.onsuccess = () => resolve(req.target.result);
    });
}

async function getFicheFromDB(localId) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(EDIT_STORE, 'readonly');
        const req = tx.objectStore(EDIT_STORE).get(parseInt(localId));
        req.onerror = () => reject(req.error);
        req.onsuccess = () => resolve(req.result);
    });
}

async function updateFicheInDB(localId, data) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(EDIT_STORE, 'readwrite');
        const store = tx.objectStore(EDIT_STORE);
        
        const getReq = store.get(parseInt(localId));
        getReq.onsuccess = () => {
            const existing = getReq.result;
            if (!existing) {
                reject(new Error('Fiche non trouvée'));
                return;
            }
            
            const updated = {
                ...existing,
                ...data,
                local_id: parseInt(localId),
                synced: false,
                updated_at: new Date().toISOString()
            };
            
            const putReq = store.put(updated);
            putReq.onsuccess = () => resolve(updated);
            putReq.onerror = () => reject(putReq.error);
        };
        getReq.onerror = () => reject(getReq.error);
    });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Liste complète des champs du formulaire
const FORM_FIELDS = [
    { label: 'Entreprise *', name: 'entreprise', type: 'text', required: true, placeholder: 'Nom de l\'entreprise' },
    { label: 'Lieu', name: 'lieu', type: 'text', required: false, placeholder: 'Lieu du contrôle' },
    { label: 'Adresse', name: 'adresse', type: 'text', required: false, placeholder: 'Adresse complète' },
    { label: 'Téléphone', name: 'telephone', type: 'tel', required: false, placeholder: 'Numéro de téléphone' },
    { label: 'Email', name: 'email_entreprise', type: 'email', required: false, placeholder: 'Email de l\'entreprise' },
    { label: 'Date de contrôle *', name: 'date_controle', type: 'date', required: true },
    { label: 'Statut', name: 'statut', type: 'select', required: false, options: [
        { value: 'brouillon', label: 'Brouillon' },
        { value: 'soumis', label: 'Soumis' }
    ]},
    { label: 'Observations générales', name: 'observations_generales', type: 'textarea', required: false, rows: 4, placeholder: 'Observations...' },
    { label: 'Chef d\'établissement', name: 'chef_nom', type: 'text', required: false, placeholder: 'Nom du chef' },
    { label: 'Email du chef', name: 'chef_email', type: 'email', required: false, placeholder: 'Email' },
    { label: 'Téléphone du chef', name: 'chef_cellulaire', type: 'tel', required: false, placeholder: 'Téléphone' }
];

async function loadFiche() {
    const loadingDiv = document.getElementById('loading');
    const formDiv = document.getElementById('offline-form');
    const formFields = document.getElementById('form-fields');
    
    if (!formFields) return;
    
    try {
        const fiche = await getFicheFromDB(window.localFicheId);
        if (!fiche) {
            if (loadingDiv) {
                loadingDiv.innerHTML = '<div class="alert alert-danger">Fiche non trouvée</div>';
            }
            return;
        }
        
        if (loadingDiv) loadingDiv.style.display = 'none';
        if (formDiv) formDiv.style.display = 'block';
        
        // Générer le formulaire
        let html = '';
        for (const field of FORM_FIELDS) {
            const value = fiche[field.name] || '';
            const requiredAttr = field.required ? 'required' : '';
            
            if (field.type === 'textarea') {
                html += `
                    <div class="mb-3">
                        <label class="form-label fw-semibold">${field.label}</label>
                        <textarea class="form-control" name="${field.name}" rows="${field.rows || 3}" ${requiredAttr} placeholder="${escapeHtml(field.placeholder || '')}">${escapeHtml(value)}</textarea>
                    </div>
                `;
            } else if (field.type === 'select') {
                let options = '';
                for (const opt of field.options) {
                    options += `<option value="${opt.value}" ${value === opt.value ? 'selected' : ''}>${opt.label}</option>`;
                }
                html += `
                    <div class="mb-3">
                        <label class="form-label fw-semibold">${field.label}</label>
                        <select class="form-select" name="${field.name}" ${requiredAttr}>
                            ${options}
                        </select>
                    </div>
                `;
            } else {
                html += `
                    <div class="mb-3">
                        <label class="form-label fw-semibold">${field.label}</label>
                        <input type="${field.type}" class="form-control" name="${field.name}" value="${escapeHtml(value)}" ${requiredAttr} placeholder="${escapeHtml(field.placeholder || '')}">
                    </div>
                `;
            }
        }
        
        // Ajouter les champs cachés pour conserver les métadonnées
        html += `<input type="hidden" name="local_id" value="${window.localFicheId}">`;
        if (fiche.server_pk) {
            html += `<input type="hidden" name="server_pk" value="${fiche.server_pk}">`;
        }
        
        formFields.innerHTML = html;
        
    } catch (error) {
        console.error('Erreur chargement:', error);
        if (loadingDiv) {
            loadingDiv.innerHTML = `<div class="alert alert-danger">Erreur: ${escapeHtml(error.message)}</div>`;
        }
    }
}

async function saveFiche(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const data = {};
    
    for (const [key, value] of formData.entries()) {
        data[key] = value;
    }
    
    // Validation
    if (!data.entreprise || !data.entreprise.trim()) {
        alert('Le nom de l\'entreprise est requis');
        return;
    }
    if (!data.date_controle) {
        alert('La date de contrôle est requise');
        return;
    }
    
    const saveBtn = document.getElementById('save-btn');
    const originalText = saveBtn ? saveBtn.innerHTML : '';
    
    if (saveBtn) {
        saveBtn.innerHTML = '<i class="bi bi-save"></i> Sauvegarde en cours...';
        saveBtn.disabled = true;
    }
    
    try {
        await updateFicheInDB(window.localFicheId, data);
        alert('Fiche modifiée avec succès !');
        window.location.href = `/inspection/fiche/local/${window.localFicheId}/detail/`;
    } catch (error) {
        alert('Erreur lors de la sauvegarde: ' + error.message);
        if (saveBtn) {
            saveBtn.innerHTML = originalText;
            saveBtn.disabled = false;
        }
    }
}

function cancelEdit() {
    window.location.href = `/inspection/fiche/local/${window.localFicheId}/detail/`;
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    const match = path.match(/\/inspection\/fiche\/local\/(\d+)\/edit/);
    if (match) {
        window.localFicheId = parseInt(match[1]);
    }
    
    loadFiche();
    
    const form = document.getElementById('offline-form');
    const cancelBtn = document.getElementById('cancel-btn');
    
    if (form) form.addEventListener('submit', saveFiche);
    if (cancelBtn) cancelBtn.addEventListener('click', cancelEdit);
});

console.log('[OfflineEdit] Script chargé');
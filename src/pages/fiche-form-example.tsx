/**
 * Exemple complet d'utilisation du mode offline
 * Montre comment intégrer la synchronisation dans une page
 */

import React, { useState } from 'react';
import { useOfflineManager, useFiche } from '@/hooks/use-offline';
import { SyncPanel } from '@/components/sync-indicator';

/**
 * Page d'exemple pour créer/modifier une fiche
 */
export function FicheFormExample() {
  const { saveFiche, getAllFiches, sync } = useOfflineManager();
  const [fiches, setFiches] = useState([]);
  const [formData, setFormData] = useState({
    entreprise: '',
    date_controle: new Date().toISOString().split('T')[0],
    lieu: 'Louga',
    adresse: '',
    telephone: '',
    email_entreprise: '',
  });
  const [loading, setLoading] = useState(false);

  // Charger les fiches
  const loadFiches = async () => {
    try {
      setLoading(true);
      const data = await getAllFiches();
      setFiches(data);
    } catch (error) {
      console.error('Erreur chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  // Sauvegarder la fiche
  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const id = await saveFiche({
        ...formData,
        inspecteur: 'current_user',
        statut: 'brouillon',
      });

      // Recharger la liste
      await loadFiches();

      // Reset form
      setFormData({
        entreprise: '',
        date_controle: new Date().toISOString().split('T')[0],
        lieu: 'Louga',
        adresse: '',
        telephone: '',
        email_entreprise: '',
      });

      alert(`✓ Fiche sauvegardée (ID: ${id})`);
    } catch (error) {
      alert(`✗ Erreur: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Synchroniser manuellement
  const handleSync = async () => {
    try {
      setLoading(true);
      await sync();
      alert('✓ Synchronisation complétée');
    } catch (error) {
      alert(`✗ Erreur sync: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Panneau de synchronisation */}
      <SyncPanel />

      {/* Formulaire */}
      <form onSubmit={handleSave} className="space-y-4">
        <h2 className="text-xl font-bold">Nouvelle Fiche Contrôle</h2>

        <div>
          <label className="block text-sm font-medium mb-1">
            Entreprise *
          </label>
          <input
            type="text"
            required
            value={formData.entreprise}
            onChange={(e) => setFormData({ ...formData, entreprise: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg"
            placeholder="Nom de l'entreprise"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Date contrôle</label>
            <input
              type="date"
              value={formData.date_controle}
              onChange={(e) => setFormData({ ...formData, date_controle: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Lieu</label>
            <input
              type="text"
              value={formData.lieu}
              onChange={(e) => setFormData({ ...formData, lieu: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Adresse</label>
          <textarea
            value={formData.adresse}
            onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg"
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Téléphone</label>
            <input
              type="tel"
              value={formData.telephone}
              onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={formData.email_entreprise}
              onChange={(e) => setFormData({ ...formData, email_entreprise: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>

          <button
            type="button"
            onClick={handleSync}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            Synchroniser
          </button>

          <button
            type="button"
            onClick={loadFiches}
            disabled={loading}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
          >
            Rafraîchir
          </button>
        </div>
      </form>

      {/* Liste des fiches */}
      <div>
        <h3 className="text-lg font-bold mb-4">Fiches sauvegardées</h3>
        {fiches.length === 0 ? (
          <p className="text-gray-500">Aucune fiche trouvée</p>
        ) : (
          <div className="space-y-2">
            {fiches.map((fiche) => (
              <FicheCard key={fiche.id || fiche.local_id} fiche={fiche} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Composant pour afficher une fiche
 */
function FicheCard({ fiche }) {
  const { fiche: currentFiche, save, delete: deleteFiche, loading } = useFiche(
    fiche.id || fiche.local_id
  );

  const handleDelete = async () => {
    if (confirm('Êtes-vous sûr?')) {
      try {
        await deleteFiche();
        alert('✓ Fiche supprimée');
      } catch (error) {
        alert(`✗ Erreur: ${error.message}`);
      }
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-white hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h4 className="font-semibold text-lg">{fiche.entreprise}</h4>
          <div className="text-sm text-gray-600 space-y-1 mt-2">
            <p>📍 {fiche.lieu}</p>
            <p>📅 {fiche.date_controle}</p>
            {fiche.telephone && <p>📞 {fiche.telephone}</p>}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => alert('TODO: Ouvrir édition')}
            className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
          >
            Éditer
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 disabled:opacity-50"
          >
            Supprimer
          </button>
        </div>
      </div>

      {/* Status badge */}
      <div className="mt-3 text-xs">
        {fiche.id ? (
          <span className="px-2 py-1 bg-green-100 text-green-700 rounded">
            ✓ Serveur
          </span>
        ) : (
          <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded">
            📱 Local (en attente sync)
          </span>
        )}
      </div>
    </div>
  );
}

export default FicheFormExample;

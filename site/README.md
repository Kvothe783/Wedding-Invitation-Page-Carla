# Hugo & Carla — faire-part (vin d'honneur)

Mini site statique (HTML/CSS/JS, sans dépendance ni build) pour le mariage du 14 mai 2027. Cinq sections plein écran avec défilement à ancrage (« snap »), pensées mobile-first : Hugo & Carla, Le programme, Dress Code, un mot des mariés, RSVP.

## Utilisation

Aucune installation nécessaire : ouvrez `index.html` dans un navigateur, ou déployez le dossier `site/` tel quel sur n'importe quel hébergeur statique (GitHub Pages, Netlify, Vercel, etc.).

```
site/
  index.html
  styles.css
  script.js
  assets/            images (branches, alliances, coupe, couple)
```

## Brancher les réponses RSVP sur un Google Sheet

Par défaut, chaque réponse au formulaire est simplement conservée dans le navigateur du visiteur (`localStorage`), sans envoi réseau. Pour centraliser les réponses dans une feuille Google Sheets partagée :

1. Créez un nouveau Google Sheet avec les colonnes : `date`, `nom`, `prenom`, `presence`, `nombre`.
2. Dans le Sheet, **Extensions → Apps Script**, et collez :
   ```js
   function doPost(e) {
     var d = JSON.parse(e.postData.contents);
     SpreadsheetApp.getActiveSheet().appendRow([d.date, d.nom, d.prenom, d.presence, d.nombre]);
     return ContentService.createTextOutput('ok');
   }
   ```
3. **Déployer → Nouveau déploiement → Application Web**. Exécuter en tant que « Moi », accès « Tout le monde ». Copiez l'URL se terminant par `/exec`.
4. Collez cette URL dans `script.js`, en haut du fichier :
   ```js
   const CONFIG = {
     sheetUrl: 'https://script.google.com/macros/s/…/exec'
   };
   ```

Sans URL renseignée, le formulaire continue de fonctionner normalement (mode démo local).

## Notes

- Polices : EB Garamond + Pinyon Script (Google Fonts).
- Le formulaire respecte `prefers-reduced-motion` et évite le zoom automatique iOS (champs à 16px sous 420px de large).
- Adresses : cérémonie au 17 grand place, Roubaix (15h30) ; vin d'honneur Lauwestraat 59, Wevelgem, Belgique (17h00) — chacune ouvre Google Maps dans un nouvel onglet.

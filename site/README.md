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

## Brancher les réponses RSVP sur un Google Sheet (+ emails automatiques)

Par défaut, chaque réponse au formulaire est simplement conservée dans le navigateur du visiteur (`localStorage`), sans envoi réseau. Le backend complet (Sheet + emails) vit dans **[`google-apps-script/Code.gs`](../google-apps-script/Code.gs)** — c'est le fichier à coller dans l'éditeur Apps Script.

1. Créez un Google Sheet (les colonnes `date`, `nom`, `prenom`, `presence`, `nombre`, `email` s'auto-créent au premier envoi si la ligne 1 est vide).
2. Dans le Sheet, **Extensions → Apps Script**, effacez le contenu par défaut et collez tout le contenu de `google-apps-script/Code.gs`.
3. En haut du fichier, `CONFIG.brideEmail` contient l'adresse qui reçoit l'alerte de chaque réponse — à ajuster si besoin.
4. Sélectionnez `test_sendSampleEmails` dans le menu déroulant des fonctions (barre du haut) et cliquez **Run** une fois : ça déclenche l'écran d'autorisation (accès Sheets + envoi d'email en votre nom — même écran « Google n'a pas vérifié cette application » que pour la première autorisation, cliquez **Advanced → Go to … (unsafe) → Allow**), puis envoie 4 emails de test à votre propre adresse pour vérifier le rendu.
5. **Déployer → Nouveau déploiement → Application Web**. Exécuter en tant que « Moi », accès « Tout le monde ». Copiez l'URL se terminant par `/exec`.

   Pour mettre à jour ce code plus tard **sans changer l'URL** : Déployer → **Gérer les déploiements** → icône crayon sur le déploiement existant → Version → **Nouvelle version** → Déployer.
6. Collez cette URL dans `script.js`, en haut du fichier :
   ```js
   const CONFIG = {
     sheetUrl: 'https://script.google.com/macros/s/…/exec'
   };
   ```

Sans URL renseignée, le formulaire continue de fonctionner normalement (mode démo local), sans email.

Comportement du backend :
- Une même personne (même nom + prénom, insensible à la casse) qui repasse par « Modifier ma réponse » met à jour sa ligne existante dans le Sheet au lieu d'en créer une nouvelle, et renvoie les emails avec les nouvelles infos.
- **Email au répondant** (si présent·e) : confirmation avec le programme complet (cérémonie + vin d'honneur), un bouton « + Google Calendar » et « + Outlook » pour chacun des deux événements, et un fichier `.ics` joint (les deux événements dedans) pour Apple Calendar. Si absent·e : email plus court, sans bloc calendrier.
- **Email à Carla** (`CONFIG.brideEmail`) : à chaque réponse, avec nom, prénom, email, réponse et nombre de personnes si présent·e.
- Les deux emails reprennent la charte du site (fond crème, vert olive, serif élégant) et sont envoyés sous le nom « Hugo & Carla », avec le reply-to réglé sur l'adresse de Carla.

## Notes

- Polices : EB Garamond + Pinyon Script (Google Fonts).
- Le formulaire respecte `prefers-reduced-motion` et évite le zoom automatique iOS (champs à 16px sous 420px de large).
- Adresses : cérémonie au 17 grand place, Roubaix (15h30) ; vin d'honneur Lauwestraat 59, Wevelgem, Belgique (17h00) — chacune ouvre Google Maps dans un nouvel onglet.

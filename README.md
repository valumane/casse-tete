# Tri malin

Un petit casse-tête à blocs coulissants, recréé à partir d’un puzzle de **Professeur Layton**.

## Pourquoi ce projet ?

Un ami jouait à Professeur Layton et galérait sur ce casse-tête. J’ai donc décidé de le recréer dans une version plus simple, jouable directement dans un navigateur, pour pouvoir chercher la solution plus facilement.

## Le but du jeu

Amener le **bloc rouge dans la zone verte** en déplaçant les autres blocs pour lui ouvrir le passage.

Les blocs glissent horizontalement ou verticalement, sans tourner ni se traverser. Au départ, les deux gros blocs jaunes sont au-dessus des quatre petits blocs bleus et la zone d’arrivée est vide.

## Jouer

- Fais glisser les blocs avec la souris ou le doigt.
- Tu peux aussi sélectionner un bloc puis utiliser les flèches du clavier ou les boutons de direction.
- **Annuler** permet de revenir au déplacement précédent, tout comme **Ctrl+Z / Cmd+Z**.
- **Recommencer** remet les blocs à leur position de départ.

Le jeu compte les coups et conserve la partie ainsi que le meilleur score dans le navigateur.

## Lancer le projet

Le jeu est fait en **HTML, CSS et JavaScript**, sans dépendance ni compilation.

Depuis le dossier du projet :

```bash
python3 -m http.server 8000
```

Ouvre ensuite [localhost:8000](http://localhost:8000) dans ton navigateur. Un serveur local est nécessaire pour charger les modules JavaScript.

Le projet peut aussi être hébergé directement sur GitHub Pages.

## Fichiers

| Fichier | Rôle |
| --- | --- |
| `index.html` | Interface du jeu |
| `style.css` | Apparence et adaptation aux différentes tailles d’écran |
| `game.js` | Déplacements, commandes, sauvegarde et victoire |
| `engine.js` | Règles, collisions et solveur utilisé par les tests |
| `scripts/check-game.mjs` | Vérification des règles et de la résolution du puzzle |

## Vérifications

Avec Node.js installé, sans installer de dépendances :

```bash
npm test
```

Les tests vérifient notamment les collisions, la disposition de départ, la zone d’arrivée vide et l’existence d’une solution.

---

Un projet personnel inspiré d’un casse-tête de Professeur Layton, sans affiliation avec le jeu original.

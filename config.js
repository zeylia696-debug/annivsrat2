/* =====================================================================
   CONFIGURATION DE L'AVENTURE D'ANNIVERSAIRE
   ---------------------------------------------------------------------
   C'est le seul fichier à modifier pour personnaliser l'expérience.
   - Photos  → dossier « photos/ » (jpg, png, webp). Exemple : "photos/moustache.jpg"
   - Audios  → dossier « audio/ »  (mp3, m4a). Exemple : "audio/camille.m4a"
   - null    → pas encore de fichier : le jeu affiche un emplacement
               « photo à venir » ou le texte du message, sans jamais bloquer.
   - {recipient} est remplacé par le prénom de la personne fêtée.
   Les proches sont les vrais ; les photos, les messages vocaux et
   quelques textes (souvenirs de la pièce, couches du cadeau) restent à compléter.
   ===================================================================== */
window.GIFT_CONFIG = {
  recipient: "Srat",

  /* ---------------------------------------------------------------
     LES PROCHES : chacun a son mini-chapitre.
       color      : sa couleur
       symbol     : son symbole (emoji)
       object     : l'objet qui le représente (texte affiché)
       game       : son épreuve : "constellation" | "memory" | "music"
                    | "seek" | "catch" | "timing" | "puzzle"
       photo      : photo de son souvenir (null = emplacement)
       memory     : le souvenir écrit
       hint       : un petit indice (affiché après le souvenir)
       audio / caption : message vocal principal et son texte
       joke       : « Mais ce n'est pas tout… » (private joke)
       secretAudio / secretCaption : message secret caché dans une étoile
       word       : son mot pour le final (« Joyeux », « anniversaire »…)
       wordAudio  : le même mot enregistré (null = texte seul)
     --------------------------------------------------------------- */
  participants: [
    {
      id: "spark", name: "Spark", color: "#3FA9FF", symbol: "🎥", object: "Le manoir délabré",
      animation: "burst",          // apparition de la sphère : burst | shimmer | aura | sparkles
      game: "seek",                // son épreuve (null = pas d'épreuve)
      hint: "Certaines étoiles de la pièce ont encore des choses à dire.",
      audio: null, // ex. "audio/voix/spark.mp3"
      caption: "Entre notre stream cuisine et cet urbex dans un manoir complètement délabré… on a quand même eu quelques aventures mémorables. Joyeux anniversaire !",
      secretAudio: null, secretCaption: "",
      word: "Joyeux", wordAudio: null
    },
    {
      id: "yumi", name: "Yumi", color: "#9BDFFF", symbol: "🩵", object: "Les « ta gueule »",
      animation: "shimmer",
      game: "memory",
      hint: "Le lapin adore qu'on le chatouille. Enfin… presque.",
      audio: "audio/voix/yumi.mp3",
      caption: "Ça fait longtemps qu'on se connaît, même si on n'a pas forcément mille souvenirs ensemble. Mais à chaque fois qu'on se voit, il y a toujours un petit « ta gueule » qui traîne quelque part. Et finalement, c'est aussi ça, les bons souvenirs.",
      secretAudio: null, secretCaption: "",
      word: "anniversaire", wordAudio: null
    },
    {
      id: "sf", name: "Sofles", color: "#2563EB", symbol: "🌙", object: "Les conversations à des heures absurdes",
      animation: "aura",
      game: "constellation",
      hint: "L'horloge et la lune ont un petit secret entre elles.",
      audio: "audio/voix/sf.mp3",
      caption: "Je garde surtout en tête toutes ces conversations à des heures absurdes, à parler de la vie, de l'amour, du bonheur et de ce qui compte vraiment. J'ai parfois essayé de te secouer un peu dans mes propos, mais c'était toujours pour ton bien.",
      secretAudio: null, secretCaption: "",
      word: "on t'aime", wordAudio: null
    },
    {
      id: "koumi", name: "Koumi", color: "#5B21B6", symbol: "💀", object: "Le crâne derrière la vitre",
      animation: "sparkles",
      game: "music",
      hint: "Tout ne se termine pas toujours quand on croit.",
      audio: "audio/voix/koumi.mp3",
      caption: "Je me rappelle encore de ce jour au café où j'ai aperçu un crâne à travers la fenêtre. Une tête crapuleuse, un crâne huileux… et pourtant, quelque chose m'a immédiatement attirée. C'est depuis ce jour que j'ai décidé qu'il serait mon amour pour la vie.",
      secretAudio: null, secretCaption: "",
      word: "fort", wordAudio: null
    },
    {
      id: "karnage", name: "Karnage", color: "#E11D2E", symbol: "🍁", object: "Depuis le Québec",
      animation: "burst",
      game: "catch",
      hint: null,
      audio: "audio/voix/karnage.mp3",
      caption: "🍁 Un message tout droit du Québec.",
      secretAudio: null, secretCaption: "",
      word: "Srat !", wordAudio: null
    }
  ],

  /* ---------------------------------------------------------------
     LE SOUVENIR DE CHAQUE PROCHE : une petite scène avant son message.
       type "gallery"   : des photos (images) qui arrivent une à une
       type "text"      : un texte, puis un mot qui claque à l'écran (flash)
       type "night"     : la pièce devient nocturne, l'horloge tourne (clock),
                          des mots apparaissent (words)
       type "animation" : le café, la fenêtre, le crâne (symbol) et ses répliques (lines)
     Une photo manquante affiche un emplacement avec son emoji et sa légende.
     --------------------------------------------------------------- */
  memories: [
    {
      participant: "spark",
      title: "Quelques aventures…",
      type: "gallery",
      images: [
        { src: "images/spark-cuisine.jpg", emoji: "🍳", label: "Le stream cuisine" },
        { src: "images/spark-urbex.jpg", emoji: "🏚️", label: "L'urbex au manoir" }
      ],
      text: "Un stream cuisine et un urbex dans un manoir complètement délabré."
    },
    {
      participant: "yumi",
      title: "Une longue histoire",
      type: "text",
      flash: "TA GUEULE",
      images: [{ src: "images/yumi.jpg", emoji: "🩵", label: "Le Foyer" }],
      text: "Pas besoin d'avoir mille souvenirs. Parfois, un simple « ta gueule » suffit."
    },
    {
      participant: "sf",
      title: "Des heures absurdes",
      type: "night",
      clock: ["01:00", "03:00", "05:00"],
      words: ["vie", "amour", "bonheur", "priorités"],
      images: [{ src: "images/sf.jpg", emoji: "👑", label: "Slay queen" }],
      text: "Des conversations qui commencent tard et finissent beaucoup trop tard : la vie, l'amour, le bonheur, les priorités…"
    },
    {
      participant: "koumi",
      title: "Le coup de foudre",
      type: "animation",
      symbol: "💀",
      lines: ["« tête crapuleuse »", "« crâne huileux »"],
      images: [{ src: "images/koumi.jpg", emoji: "💀", label: "" }],
      text: "Un café. Une fenêtre. Un crâne huileux. Et une histoire d'amour qui commence."
    },
    {
      participant: "karnage",
      title: "Depuis le Québec 🍁",
      type: "text",
      images: [{ src: "images/karnage.jpg", emoji: "🍁", label: "Karnage" }],
      text: "De l'autre côté de l'océan, sans s'être jamais vus en vrai… et pourtant, il est là."
    }
  ],

  /* ---------------------------------------------------------------
     LE CHAT DU LIVE : les messages des viewers, après les proches.
     Chaque message : name (pseudo), text, color (facultatif),
     audio (facultatif) : un message vocal, joué dans le chat.
     --------------------------------------------------------------- */
  viewers: {
    title: "Le chat du live",
    intro: "Ta commu aussi a laissé des messages…",
    outro: "Ta commu est là. 💜",
    messages: [
      { name: "M0T8", text: "Hello Srat, Je te souhaite un joyeux anniversaire, j'ai arrêter de compter le nombre de mois même années depuis le premier jour ou je t'ai follow car ca fait troooop longtemps maintenant, mais je tenais à te remercier du fait de faire passer de bons moments à la commu surtout dans les moments ou on peut ne pas avoir le moral ( même si je suis plus trop présent ces derniers temps (le taff me met KO) ) mais j'essaie de suivre les rediffs. Reste comme tu est et encore joyeux anniv mon cher Srat" },
      { name: "Biscuit", text: "Bon anniversaire Srat, merci pour les streams jusqu'à 6h du mat" },
      { name: "Akkuarius", text: "Bonne fête Srat, un petit message pour te remercier pour tous ce que tu fais. Je sais pas si tu te rends compte à quel point tu apporte du positif dans la vie des gens. Tu transmet ta bonne humeur dans tes lives. Pour avoir passez des moments difficiles de temps en temps, je peux te dire que tu permets à beaucoup de personne de se poser tranquille devant ton live et de parler et apprendre à connaitre des gens dans une safeplace. Je te souhaite plein de bonheur dans ton futur et j'espère que tu continuera longtemps à partager ton plaisir de stream. Bonne fête" },
      { name: "Hansdu059", text: "Salut, SRAT bon anniv pour tes 33 ans. Je t'ai connue avec 09 sur glife. Merci pour tes lives, ça fait 7 ans que je te suis et que chaque soir tu es mon rdv, et ce n'est pas prêt de s'arrêter et encore. BONNE ANNIVERSAIRE" },
      { name: "Mugus", text: "Joyeux anniversaire Srat ! Ça fait maintenant 2 ans que je te suis, même si j'ai fait une assez longue pause et que je suis revenu il y a environ 3 mois. Ça m'avait quand même manqué de regarder les lives et de retrouver l'ambiance des stream. Merci pour tous les bons moments et les délires pendant les lives que ce soit en rp ou non, c'est toujours un plaisir de passer regarder. Profite bien de ton anniversaire, de ta vie, des stream et du rp et encore joyeux anniversaire !" },
      { name: "Lolo162", text: "Joyeux anniversaire Srat !!!! Plus trop le temps actuellement de suivre les streams mais toujours un plaisir de passer. Merci de m'avoir accompagné pendant plus de 2 ans maintenant avec les soirées quotidiennes de rp. En te souhaitant plein de réussite et de bonheur." },
      { name: "Revanche300", text: "Bien le bonjour a toi Srat, je te souhaite un très joyeux anniversaire. Quand je repense à ces 8 dernières années, je me rends compte à quel point tu as compté. Tu as été un vrai repère, une présence rassurante au quotidien. Ta simplicité et ton humanité m'ont apporté et m'ont aidé à me construire au fil du temps. Merci pour les rires, les souvenirs et cette bienveillance qui n'a pas de prix. C'est une chance énorme de t'avoir connu. Passe une journée mémorable !\n\nPS je compte sur toi pour rester la personne que tu es es encore et un bon anniversaire BG" },
      { name: "Ben66", text: "Joyeux anniversaire Srat ! Merci d'être présent tous les soirs. Tu fais partie de la vie de beaucoup d'entre nous, tu nous accompagnes dans les bons comme les mauvais moments. Merci pour tout et profite à fond de cette nouvelle année qui débute pour toi ! SRT Forever" },
      { name: "Pedro_7", text: "Salut Srat, c'est Pedro l'aigri\n\nC'est pour te souhaiter un joyeux anniversaire !\n\nJ'aimerais tout simplement te remercier d'être la personne que tu es, tu apportes de la bonne humeur sur les streams et tu nous fait oublier les problèmes du quotidiens. Personnellement je suis passé par des moments difficiles, ça été très compliqué pour moi mais grâce à tes streams j'ai pu oublier ces moments compliqués pour des moments de joies, de bienveillances et de bien êtres, je sais que c'était pas facile pour toi d'être tout le temps de bonne humeur surtout de ce qu'il s'est passé il y a quelques années, mais t'as su rebondir et à te battre pour nous divertir, je te remercie du plus profond de mon coeur d'avoir continuer, merci et encore merci d'être toi-même.\n\nTu es une personne formidable qui nous donne de l'amour peu importe si on va bien ou pas, reste comme tu es, ne change pas pour les autres et continue d'être cette personne gentille et attentionnée parce qu'on t'aime comme ca.\n\nEncore un joyeux anniversaire Srat !" },
      { name: "DerriereToi", text: "Salut Srat ! C'est assez rare mais je t'envoie un petit message, joyeux anniversaire !! Ça fait bientôt 4 ans que je te suis (presque) tous les soirs et merci pour toutes ces soirées qui nous changent les idées et nous divertissent. Profite bien, passe un super anniversaire !!" },
      { name: "Scorpidus", text: "Srat sache que passer du temps sur ton stream me permet de décompresser un peu, ça réussit bien souvent à me rendre le sourire et pour ça je tiens vraiment à te remercier. Tu as une commu en or et faut se rendre à l'évidence elle est à ton image, bienveillante. (même si parfois t'aimes bien bully le pauvre Pedro ) Je te souhaite un très bon anniversaire, tu mérites plein de bonheur" },
      { name: "Malediction123", text: "Sratuke Je te suis depuis plusieurs années tu est ma série, je te regarde le plus possible même si je rate un épisode de temps en temps je serais là pour la suite. Tu est une de mes meilleurs découvertes de ses dernières années merci beaucoup a toi et joyeux anniversaire Sratuke" },
      { name: "Xoréo", text: "Salut, joyeux anniversaire à toi Sratuke, merci pour tes streams qui m'accompagnent depuis 7 ans déjà, où j'étais à l'internat et je te suivais que le week-end car pas d'internet là-bas et maintenant je suis dans mon appart en master, t'es streams m'ont aidé lors de périodes compliquées et sont devenus une habitude dans mes journées, ils me remontent le moral et me redonnent l'envie de dessiner comme avec les dessins à la crackito. Je suis très discret mais j'ai toujours été présent donc Merci Beaucoup. bonne anivvvv" },
      { name: "Jaryn", audio: "audio/voix/jaryn.mp3", text: "" },
      { name: "Uruf", text: "Salut Srat ! Je voulais te souhaiter un joyeux anniversaire. Un grand merci pour toutes ces heures de stream, la bonne humeur et l'énergie que tu partages avec nous au quotidien. Ne change rien, continue de nous régaler ! Passe une excellente journée d'anniversaire !" }
    ]
  },

  // La personne qui a organisé la surprise. C'est aussi la narratrice :
  // sa voix guide tout le jeu, et sa sphère arrive en dernier, dans le chapitre secret.
  // Sa couleur devient celle du lapin à la fin.
  organizer: {
    id: "orga", name: "ADG", color: "#ff8fbf", symbol: "💗", object: "La voix qui t'a guidé",
    photo: "photos/adg.jpg",
    memory: "Tout ce jeu a commencé par une idée, un soir, en pensant à toi.",
    audio: "audio/voix/adg.mp3",
    caption: "💗 Mon message, rien que pour toi.",
    word: "", wordAudio: null
  },

  /* ---------------------------------------------------------------
     LA NARRATRICE (ADG). Chaque réplique :
       audio : l'enregistrement (null = sous-titres seuls)
       text  : les phrases, affichées en sous-titres
       at    : (facultatif) la seconde où commence chaque phrase dans l'audio
     --------------------------------------------------------------- */
  narrator: {
    name: "ADG",
    label: "la narratrice",
    lines: {
      intro: { audio: "audio/narration/intro.mp3", at: [0, 6.22, 13.54],
        text: ["Bon… avant toute chose, j'ai une petite question à te poser.", "Est-ce que tu es prêt à découvrir quelque chose que plusieurs personnes ont préparé spécialement pour toi ?", "Alors… ouvre grand les yeux."] },
      world: { audio: "audio/narration/apparition-monde.mp3", at: [0, 2.46, 4.85, 9.51],
        text: ["Au début, tu ne verras peut-être pas grand-chose.", "Mais regarde bien.", "Parce que dans cet endroit… tout a une raison d'être là.", "Et certaines choses sont beaucoup mieux cachées que d'autres."] },
      sleeping: { audio: "audio/narration/lapin-dort.mp3", at: [0, 0.9, 3.42],
        text: ["Chut…", "Je crois que quelqu'un dort.", "Et je crois surtout que tu vas devoir le réveiller."] },
      wake: { audio: "audio/narration/lapin-reveille.mp3", at: [0, 1.1, 2.06],
        text: ["Oh…", "Tu l'as réveillé.", "Maintenant, je crois qu'il va falloir le suivre."] },
      flee: { audio: "audio/narration/lapin-senfuit.mp3", at: [0.0, 0.7, 2.2, 6.92],
        text: ["Attends !", "Il est parti !", "Bon… apparemment, monsieur le lapin a décidé que tu allais devoir jouer avec lui.", "Essaie de le retrouver."] },
      afterSeek: { audio: "audio/narration/apres-cache-cache.mp3", at: [0, 1.76, 3.3, 5.9],
        text: ["Tu l'as trouvé.", "Mais regarde-le…", "Il a l'air beaucoup trop fier de lui.", "Et je crois qu'il veut te montrer quelque chose."] },
      firstDiscovery: { audio: "audio/narration/premiere-decouverte.mp3", at: [0.0, 1.7, 4.32],
        text: ["Tu vois cet objet ?", "Essaie de regarder autour de toi.", "Il y a peut-être plus de choses à découvrir que tu ne le pensais."] },
      souvenirFound: { audio: "audio/narration/souvenir-trouve.mp3", at: [0.0, 1.97, 7.07],
        text: ["Oh…", "Celui-là, je voulais vraiment qu'il soit là.", "Prends quelques secondes pour le regarder."] },
      secretFound: { audio: "audio/narration/secret-trouve.mp3", at: [0.0, 1.41, 5.74],
        text: ["Tu l'as trouvé.", "Mais je ne vais certainement pas te dire combien il y en a.", "À toi de chercher."] },
      giftFound: { audio: "audio/narration/decouverte-cadeau.mp3", at: [0, 1.39, 3.02, 4.55],
        text: ["Voilà.", "C'est pour toi.", "Mais…", "Tu pensais vraiment que j'allais te laisser l'ouvrir aussi facilement ?"] },
      beforeTrials: { audio: "audio/narration/avant-premiere-epreuve.mp3", at: [0.0, 2.08, 4.13],
        text: ["Ce cadeau est un peu spécial.", "Et pour découvrir ce qu'il contient…", "Il va falloir avancer étape par étape."] },
      ribbon: { audio: "audio/narration/epreuve-ruban.mp3", at: [0.0, 1.15, 2.42, 4.58, 7.7],
        text: ["Première étape.", "Le ruban.", "Tu vas devoir trouver comment le défaire.", "Et non, je ne vais pas t'aider.", "Enfin… pas encore."] },
      ribbonDone: { audio: "audio/narration/ruban-reussi.mp3", at: [0, 0.9, 2.33],
        text: ["Et voilà.", "Une étape de moins.", "Mais tu n'as encore rien vu."] },
      paper: { audio: "audio/narration/epreuve-papier.mp3", at: [0.0, 2.22, 5.35, 7.02],
        text: ["Deuxième étape.", "Cette fois, il va falloir être un peu plus patient.", "Regarde bien le cadeau.", "Quelque chose te permettra peut-être de comprendre quoi faire."] },
      paperDone: { audio: "audio/narration/papier-reussi.mp3", at: [0, 1.91, 4.5],
        text: ["Voilà…", "Tu commences à comprendre comment ça fonctionne.", "Continue."] },
      timing: { audio: "audio/narration/epreuve-rythme.mp3", at: [0.0, 0.77, 4.78, 5.57, 8.01],
        text: ["Bon.", "Maintenant, il va falloir être attentif.", "Pas trop vite.", "Pas trop lentement.", "Au bon moment."] },
      timingMiss: { audio: "audio/narration/rythme-rate.mp3", at: [0.0, 2.26],
        text: ["Presque !", "Je t'avais prévenu."] },
      timingDone: { audio: "audio/narration/rythme-reussi.mp3", at: [0.0, 1.61],
        text: ["Parfait.", "Tu vois ? Quand tu prends ton temps, ça fonctionne beaucoup mieux."] },
      charge: { audio: "audio/narration/derniere-epreuve.mp3", at: [0.0, 1.43, 2.58, 5.41, 6.3],
        text: ["Dernière étape.", "Et celle-là…", "Je veux vraiment que tu prennes ton temps.", "Pose ton doigt.", "Et regarde bien ce qui va se passer."] },
    },
    reveal: ["Tu l'avais reconnue ?", "La voix qui t'a guidé depuis le début…", "C'était moi."]
  },

  // Tout le monde ensemble, à la toute fin
  together: { text: "JOYEUX ANNIVERSAIRE !", audio: null },

  /* ---------------------------------------------------------------
     LES 10 SOUVENIRS cachés dans la pièce.
       object : l'objet de la pièce qui le cache. Choix possibles :
                moon, strawberries, console, radio, frame1, frame2, frame3,
                plush, medallion, cap, clock, note, book
       digit  : le chiffre écrit au dos (sert pour l'énigme du coffre)
       music  : (facultatif) un morceau à jouer quand on ouvre ce souvenir
     --------------------------------------------------------------- */
  souvenirs: [
    { id: "lune", object: "moon", symbol: "🌙", title: "Cette nuit-là", text: "Tu te rappelles cette nuit-là ? La tour qui brille, et la lune juste à côté.", photo: "photos/nuit.jpg", digit: 2 },
    { id: "fraises", object: "strawberries", symbol: "🍓", title: "L'affaire des fraises", text: "Personne ne saura jamais combien de fraises ont réellement disparu ce jour-là.", photo: "photos/fraises.jpg", digit: 7 },
    { id: "jeu", object: "console", symbol: "🎮", title: "Le record", text: "Ce record que personne n'a jamais battu. On a essayé. Beaucoup.", photo: "photos/record.jpg", digit: 4 },
    { id: "musique", object: "radio", symbol: "🎵", title: "La chanson", text: "« Roméo », de SASP.", photo: "photos/chanson-romeo.jpg", music: null, digit: 9 },
    { id: "ancienne", object: "frame3", symbol: "📸", title: "Le tableau", text: "Le grand tableau SNK.", photo: "photos/tableau-snk.jpg", digit: 1 },
    { id: "moustache", object: "frame1", symbol: "🥸", title: "La photo moustache", text: "La fameuse moustache. On ne l'oubliera jamais, désolé.", photo: "photos/moustache.jpg", digit: 5 },
    { id: "maquillage", object: "frame2", symbol: "🤠", title: "Le bandito", text: "Le bandito, dans toute sa splendeur.", photo: "photos/bandito.jpg", digit: 3 },
    { id: "peluche", object: "plush", symbol: "🤡", title: "Le lapi clown", text: "LE LAPI CLOWN !", photo: "photos/lapi-clown.jpg", digit: 8 },
    { id: "medaillon", object: "medallion", symbol: "🪽", title: "La figurine SNK", text: "La figurine SNK, exposée avec fierté. Shinzou wo sasageyo !", photo: "photos/figurine-snk.jpg", digit: 6 },
    { id: "casquette", object: "cap", symbol: "🧢", title: "La casquette", text: "Celle que tu ne quittais jamais. Même en hiver.", photo: "photos/casquette.jpg", digit: 0 }
  ],

  // Énigme du coffre : les souvenirs dont il faut retrouver le chiffre, dans l'ordre
  code: { souvenirs: ["fraises", "jeu", "lune", "musique"] },

  // Petits mots posés dans la pièce (pas comptés comme souvenirs)
  roomNotes: {
    note: "« Ne pas oublier : être heureux. » — un petit mot épinglé au mur.",
    book: "Un carnet. Sur la première page, ton prénom, écrit avec soin."
  },

  /* ---------------------------------------------------------------
     LE CADEAU EN COUCHES. Chaque couche a une épreuve et révèle quelque chose.
       game : "ribbon" | "paper" | "timing" | "puzzle" | "code" | "charge"
       reveal.kind : "photo" | "phrase" | "souvenir" | "color" | "voice" | "people"
     --------------------------------------------------------------- */
  gift: {
    paper: "#f4b6c9", paperDark: "#e892ad", ribbon: "#ffd36b", ribbonDark: "#e9a93a",
    layers: [
      { name: "Le ruban", game: "ribbon",
        reveal: { kind: "photo", title: "Sous le ruban", text: "Une première photo, glissée là pour toi.", photo: "photos/chat.jpg" } },
      { name: "Le papier", game: "paper",
        reveal: { kind: "photo", title: "Sous le papier", text: "Un contrat. Signé. Toutes les clauses sont non négociables.", photo: "photos/contrat.jpg" } },
      { name: "La deuxième boîte", game: "timing",
        reveal: { kind: "souvenir", title: "Au fond de la boîte", text: "Un dessin, glissé tout au fond. Rien que pour toi.", photo: "photos/dessin-sratuke.jpg" } },
      { name: "La lettre", game: "puzzle",
        reveal: { kind: "color", text: "Une couleur s'échappe de la lettre…" } },
      { name: "Le petit coffre", game: "code",
        reveal: { kind: "voice", text: "Une voix s'échappe du coffre…", audio: null, caption: "Tu y es presque. Continue, on t'attend." } },
      { name: "Le cadeau final", game: "charge",
        reveal: { kind: "people", text: "Il n'y a pas d'objet au fond. Il y a des gens." } }
    ]
  },

  // Couleurs que prend la pièce, chapitre après chapitre
  chapterColors: ["#ff8fbf", "#9b6bff", "#3fa9ff", "#ffcc4d", "#ff5a5f"],

  /* ---------------------------------------------------------------
     SECRETS ET EASTER EGGS
     --------------------------------------------------------------- */
  secrets: {
    moonMessage: "La lune te fait dire qu'elle t'a vu veiller trop tard. Plusieurs fois.",
    comboSequence: ["clock", "moon", "clock"], // objets à toucher dans cet ordre
    comboMessage: "Tu as trouvé la combinaison secrète ! Le lapin a une danse rien que pour toi.",
    idleMessage: "…tu es toujours là ? Le lapin s'ennuie, regarde.",
    tickleMessage: "ARRÊTE DE ME CHATOUILLER 😭",
    angryMessage: "Bon. Ça suffit maintenant. 😤",
    bonus: {
      title: "✦ SECRET DÉBLOQUÉ ✦",
      text: "Tu as retrouvé tous tes souvenirs. Cette dernière photo, personne d'autre ne l'a vue.",
      photo: "photos/secrete.jpg", audio: null
    }
  },

  /* ---------------------------------------------------------------
     TEXTES
     --------------------------------------------------------------- */
  texts: {
    splashTitle: "Une petite aventure pour toi",
    splashHint: "Touche l'écran pour commencer",
    splashSound: "Monte le son, ça vaut le coup",
    splashResume: "Touche l'écran pour reprendre ton aventure",
    returnLine: "Tu es revenu ! Je savais que tu reviendrais.",

    // Prologue
    prologue1: "Il fait tout noir…",
    prologue2: "Promène ton doigt pour éclairer la pièce.",
    prologueSleeper: "On dirait que quelqu'un dort, là-bas…",
    photoWonder: "Tiens… pourquoi cette photo est ici ?",
    objectWonder: "Tiens… qu'est-ce que c'est ?",

    // Chapitre I — le lapin
    ch1: "Chapitre I — Le lapin",
    wake: "Oh ! De la visite !",
    flee: "Attrape-moi si tu peux !",
    seekHint: "Il s'est caché quelque part dans le noir…",
    seekNudge: "Hi hi… je suis par là !",
    seekFound: ["Trouvé !", "Encore trouvé !", "D'accord, d'accord…"],
    follow: "Bravo ! Suis-moi, j'ai quelque chose à te montrer.",

    // Chapitre II — le cadeau
    ch2: "Chapitre II — Le cadeau",
    giftHere: "Ta-da ! C'est pour toi.",
    notOver: "Tu pensais que c'était terminé ?",
    thief: "Hop ! Ce bout de ruban est à moi !",
    thiefSeek: "Le lapin a volé un bout du ruban. Retrouve-le !",
    thiefFound: "D'accord, je te le rends…",
    layerTitle: "Couche {n} — {name}",

    // Chapitre III — l'énigme
    ch3: "Chapitre III — Les souvenirs",
    lockTitle: "Je suis caché quelque part dans tes souvenirs. Trouve-moi.",
    lockHint: "Chaque symbole est un souvenir de la pièce. Son chiffre est écrit au dos.",
    lockWrong: "Ce n'est pas ça… Regarde au dos de tes souvenirs.",
    lockHelp: "Bon, je t'aide : c'est {code}.",
    lockOpen: "CLIC !",
    lockSearch: "Chercher dans la pièce",
    lockMissing: "Ce souvenir est encore caché dans la pièce.",

    // Chapitres IV et V — les proches
    ch4: "Chapitre IV — Les couleurs",
    someone: "Quelqu'un a laissé quelque chose pour toi…",
    gameFor: "L'épreuve de {name}",
    hintLabel: "Un petit indice",
    notAll: "Mais ce n'est pas tout…",
    toSky: "{name} rejoint le ciel.",

    // Chapitre VI — le secret
    fakeEnd1: "Voilà…",
    fakeEnd2: "C'est terminé.",
    notFinished: "Tu croyais vraiment que j'avais fini ?",
    ch6: "Chapitre VI — Le secret",
    roomChanged: "Attends… la pièce est complètement différente.",
    doorHint: "Il y a une porte qui n'existait pas avant.",
    lastOne: "Il reste une dernière personne.",

    // Chapitre VII et final
    ch7: "Chapitre VII — Tous réunis",
    gathering: "Tout le monde est réuni pour toi.",

    // Fin et album
    album: "Ton album",
    albumSouvenirs: "Souvenirs",
    albumPeople: "Personnes",
    albumSecrets: "Secrets",
    albumEmpty: "Encore caché…",
    foundCount: "Tu as découvert {n} souvenirs sur {total}.",
    keepExploring: "Tu peux continuer à explorer pour tous les retrouver.",
    explore: "Explorer la pièce",
    replayAll: "Tout revoir",
    restart: "Recommencer depuis le début",
    rereadCard: "Revoir le petit mot",
    close: "Fermer",
    listen: "Écouter",
    skip: "Passer",
    skipGame: "Passer l'épreuve",
    textOnly: "message écrit",
    photoSoon: "photo à venir",
    secretVoice: "Un message secret"
  },

  // Message final, écrit « à la main »
  finalCard: {
    title: "✦ Un petit mot pour toi ✦",
    paragraphs: [
      "Joyeux anniversaire !",
      "On voulait te préparer quelque chose de différent, quelque chose qui te ressemble et qui rassemble toutes les personnes qui tiennent à toi.",
      "Chaque couleur, chaque petit détail et chaque voix représentent une personne qui a voulu laisser une trace dans ce cadeau.",
      "On espère que tu garderas un joli souvenir de cette petite surprise, et que cette nouvelle année t'apportera tout ce que tu mérites.",
      "On t'aime, joyeux anniversaire. ♡"
    ],
    signature: ""
  },

  /* ---------------------------------------------------------------
     SON ET RYTHME
     --------------------------------------------------------------- */
  audio: {
    music: "audio/musique.mp3", // la musique de fond (null = musique générée par le jeu)
    musicVolume: 0.55,
    duckVolume: 0.12,   // volume de la musique pendant les voix
    showCaptions: true
  },
  timings: {
    typeSpeed: 42,
    handwritingSpeed: 22,
    seekSpots: 3,       // cachettes du lapin au chapitre I
    skipGameAfter: 40   // secondes avant de proposer « Passer l'épreuve »
  }
};

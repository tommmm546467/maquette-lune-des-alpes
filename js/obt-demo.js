/* Chalet Lune des Alpes : données de démonstration pour le panneau de réservation OBT.
 *
 * Le panneau est le vrai script de l'application (obt-gestion.com/blocks/obt-booking.js), le même que
 * sur le site de T'Nature. Le chalet n'a pas encore de compte dans l'application : ce fichier répond à
 * sa place, dans le navigateur, pour une adresse factice (DEMO_API). Rien n'est lu dans l'application
 * et rien n'y est écrit ; la demande finale n'est envoyée nulle part.
 *
 * Tarifs et règles relevés le 28/10/2026 (fiche Gîtes de France 73G306281 et site d'Olivier) :
 * à partir de 1 050 € la semaine, ménage de fin de séjour 200 € en option, caution 1 000 €, 12 personnes.
 * Démonstration : la semaine plancher partout (150 € la nuit, 1 050 € les 7 nuits), 3 nuits au moins ;
 * à la semaine, du samedi au samedi, pendant les vacances de Noël et d'hiver. La vraie grille par saison
 * est à demander à Olivier. Les séjours déjà pris sont inventés, pour montrer le planning.
 */
(function () {
  "use strict";
  var DEMO_API = "https://demo-lune-des-alpes.obt.invalid";
  var DEMO_ENVOI = "https://demo-lune-des-alpes.obt.invalid/envoi";

  var JOUR = 86400000;
  var iso = function (d) { return d.toISOString().slice(0, 10); };
  var date = function (s) { return new Date(s + "T00:00:00Z"); };
  var auj = new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()));
  var plus = function (n) { return iso(new Date(auj.getTime() + n * JOUR)); };

  // Vacances scolaires de Noël et d'hiver, du samedi au samedi (toutes zones réunies)
  var SEMAINES = [
    { start: "2026-12-19", end: "2027-01-02" },
    { start: "2027-02-06", end: "2027-03-06" },
    { start: "2027-12-18", end: "2028-01-01" },
    { start: "2028-02-05", end: "2028-03-04" },
  ];
  var SEMAINE = 105000, NUIT = SEMAINE / 7;
  var semaineDe = function (s) { return SEMAINES.filter(function (p) { return p.start <= s && s < p.end; })[0]; };

  var CHALET = { id: "lune-des-alpes", name: "Chalet Lune des Alpes", kind: "gite", capacity: 12, minNights: 3,
    note: "120 m² sur trois niveaux, 5 chambres, 3 salles de bain, terrasse plein sud-est", image: "images/chalet/terrasse.jpg" };
  var MIN_SEJOURS = SEMAINES.map(function (p) { return { start: p.start, end: iso(new Date(date(p.end).getTime() - JOUR)), minNights: 7 }; });

  var OCCUPE = [
    { start: plus(9), end: plus(13) },
    { start: plus(23), end: plus(27) },
    { start: "2026-12-26", end: "2027-01-02" },
    { start: "2027-02-13", end: "2027-02-20" },
  ];

  var OPTIONS = [
    { id: "menage", name: "Ménage de fin de séjour", priceCents: 20000, unit: "sejour" },
    { id: "linge", name: "Draps et serviettes fournis", priceCents: 0, unit: "sejour", included: true },
    { id: "charges", name: "Chauffage et électricité compris", priceCents: 0, unit: "sejour", included: true },
    { id: "wifi", name: "Wifi fibre dans tout le chalet", priceCents: 0, unit: "sejour", included: true },
  ].map(function (o) {
    return { id: o.id, name: o.name, priceCents: o.priceCents, unit: o.unit, logementIds: [], appliesTo: "all",
      minGuests: null, minNights: null, included: !!o.included, mandatory: !!o.mandatory, maxGuests: null, maxNights: null,
      periodStart: null, periodEnd: null, includedGuests: null, adultsOnly: false };
  });

  var CONDITIONS = [
    { id: "sejours", title: "Durée des séjours", body: "Séjours à partir de 3 nuits. Pendant les vacances scolaires de Noël et d’hiver, location à la semaine, du samedi au samedi." },
    { id: "caution", title: "Caution", body: "Une caution de 1 000 € est demandée à l’arrivée. Elle est rendue après l’état des lieux de sortie." },
    { id: "taxe", title: "Taxe de séjour", body: "La taxe de séjour de la commune de Valloire s’ajoute au prix, par adulte et par nuit." },
  ];
  var QUESTIONS = [
    { id: "ski", label: "Venez-vous pour le ski ? Nous pouvons vous indiquer les forfaits et la location de matériel." },
    { id: "arrivee", label: "À quelle heure pensez-vous arriver ?" },
    { id: "bebe", label: "Avez-vous besoin de l’équipement bébé ?" },
  ];

  var nuits = function (a, b) { return Math.round((date(b) - date(a)) / JOUR); };
  var chevauche = function (a, b, r) { return a < r.end && r.start < b; };
  var libre = function (a, b) { return !OCCUPE.some(function (r) { return chevauche(a, b, r); }); };
  var minNuits = function (a) { return semaineDe(a) ? 7 : CHALET.minNights; };
  // Pendant les vacances : arrivée et départ le samedi
  var samediOk = function (a, b) {
    var touche = SEMAINES.some(function (p) { return a < p.end && p.start < b; });
    if (!touche) return true;
    return date(a).getUTCDay() === 6 && date(b).getUTCDay() === 6;
  };

  function prixNuits(a, b) {
    var out = [];
    for (var i = 0, n = nuits(a, b); i < n; i++) out.push({ date: iso(new Date(date(a).getTime() + i * JOUR)), priceCents: NUIT });
    return out;
  }
  var somme = function (t) { return t.reduce(function (s, x) { return s + x.priceCents; }, 0); };
  var ouvert = function (a, b) { return libre(a, b) && nuits(a, b) >= minNuits(a) && samediOk(a, b); };
  var raison = function (a, b) { return !libre(a, b) ? "occupe" : nuits(a, b) < minNuits(a) || !samediOk(a, b) ? "nuits_minimum" : null; };

  function planning() {
    return { hidden: false, today: iso(auj), privacyUrl: null, questions: QUESTIONS, conditions: CONDITIONS, options: OPTIONS,
      logements: [{ id: CHALET.id, name: CHALET.name, kind: CHALET.kind, capacity: CHALET.capacity, note: CHALET.note,
        image: new URL(CHALET.image, location.href).href, minNights: CHALET.minNights, minStays: MIN_SEJOURS, contains: [], occupied: OCCUPE }] };
  }

  function disponibilites(p) {
    var a = p.get("start"), b = p.get("end"), g = +p.get("guests") || 1, ok = ouvert(a, b);
    return { hidden: false, nights: nuits(a, b), guests: g, logements: [{ id: CHALET.id, name: CHALET.name, kind: CHALET.kind,
      capacity: CHALET.capacity, note: CHALET.note, image: new URL(CHALET.image, location.href).href, fits: g <= CHALET.capacity,
      minNights: minNuits(a), available: ok, reason: ok && g > CHALET.capacity ? "places" : raison(a, b),
      accommodationCents: ok ? somme(prixNuits(a, b)) : null }] };
  }

  function devis(p) {
    var a = p.get("start"), b = p.get("end"), g = +p.get("guests") || 1, enfants = +p.get("children") || 0, n = nuits(a, b);
    var choisi = (p.get("logement") || "").split(",").indexOf(CHALET.id) >= 0;
    var t = prixNuits(a, b), hebergement = choisi ? somme(t) : 0;
    var voulues = (p.get("options") || "").split(",").filter(Boolean);
    var extras = OPTIONS.filter(function (o) { return o.mandatory || o.included || voulues.indexOf(o.id) >= 0; }).map(function (o) {
      var e = { id: o.id, name: o.name, unit: o.unit, quantity: 1, unitPriceCents: o.priceCents, totalCents: o.priceCents };
      if (o.mandatory) e.mandatory = true;
      if (o.included) e.included = true;
      return e;
    });
    return { hidden: false, available: choisi && ouvert(a, b) && g <= CHALET.capacity, nights: n, guests: g, children: enfants,
      minNights: minNuits(a), capacity: CHALET.capacity, nightly: choisi ? t : [],
      lines: choisi ? [{ id: CHALET.id, name: CHALET.name, accommodationCents: hebergement }] : [], accommodationCents: hebergement, extras: extras,
      totalCents: hebergement + extras.reduce(function (s, e) { return s + e.totalCents; }, 0) };
  }

  var repondre = function (corps) {
    return Promise.resolve(new Response(JSON.stringify(corps), { status: 200, headers: { "Content-Type": "application/json" } }));
  };
  var vraiFetch = window.fetch.bind(window);
  window.fetch = function (entree, init) {
    var url = typeof entree === "string" ? entree : entree && entree.url;
    if (!url || url.indexOf(DEMO_API) !== 0) return vraiFetch(entree, init);
    var u = new URL(url);
    // La demande et l'e-mail ne partent nulle part : le visiteur voit simplement « Merci »
    if (url.indexOf(DEMO_ENVOI) === 0 || /\/requests$/.test(u.pathname)) return repondre({ success: true, demo: true });
    if (/\/image\//.test(u.pathname)) return vraiFetch(entree, init);
    if (/\/planning$/.test(u.pathname)) return repondre(planning());
    if (/\/availability$/.test(u.pathname)) return repondre(disponibilites(u.searchParams));
    if (/\/quote$/.test(u.pathname)) return repondre(devis(u.searchParams));
    return Promise.resolve(new Response("{}", { status: 404 }));
  };
})();

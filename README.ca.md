# HomeFlow

[English](README.md) · [Español](README.es.md) · **Català**

<p align="center">
  <img src="public/homeflow-logo-rounded.png" alt="Logo de HomeFlow" width="220">
</p>

HomeFlow és una aplicació privada de finances domèstiques per registrar mensualment saldos de comptes, efectiu, ingressos, cobraments pendents, pagaments pendents, ajustos patrimonials i objectius anuals d'estalvi.

L'aplicació representa la situació econòmica de la llar mitjançant tancaments mensuals, no com un llibre de moviments. A partir d'aquests tancaments, HomeFlow calcula el patrimoni net, l'estalvi real i operatiu, la despesa estimada, la taxa d'estalvi, l'evolució històrica i diferents escenaris de previsió de final d'any.

La interfície està disponible en castellà, català i anglès, adapta el format de les dates a l'idioma seleccionat i mostra els imports en euros o dòlars nord-americans.

## Funcionalitats

- Instantànies mensuals del balanç domèstic.
- Diversos comptes bancaris, fonts d'ingressos i entrades d'efectiu.
- Seguiment de cobraments i pagaments pendents.
- Compromisos futurs que no afecten el càlcul mensual fins que es converteixen en un deute real.
- Ajustos patrimonials per a amortitzacions hipotecàries o altres canvis no operatius.
- Càlcul del patrimoni net, la liquiditat, l'estalvi, la despesa estimada i la taxa d'estalvi.
- Gràfics històrics amb intervals de dates personalitzats i mètriques seleccionables.
- Previsions de tancament anual basades en l'estalvi registrat en anys anteriors.
- Objectius anuals d'estalvi amb assignacions acumulables i no acumulables.
- Informes d'Excel amb diversos fulls per a un interval de mesos.
- Exportació i importació de la base de dades completa en format JSON, amb una còpia de seguretat automàtica abans de cada importació.
- Pantalla de benvinguda de marca durant la càrrega inicial de l'aplicació.
- Dades de demostració editables, aïllades dels registres reals i desades únicament durant la sessió de la pestanya actual.
- Modes d'aparença clara i fosca amb persistència local.
- Preferència persistent per mostrar els imports en EUR o USD.
- Interfície localitzada en castellà, català i anglès.
- Persistència local en JSON, sense cap base de dades externa ni backend en Python.

## Rutes de l'aplicació

| Ruta | Finalitat |
| --- | --- |
| `/` | Resum del mes actiu. |
| `/evolution` | Evolució històrica del patrimoni, l'estalvi, els ingressos o la despesa estimada. |
| `/forecast` | Escenaris de tancament anual basats en anys anteriors. |
| `/analysis` | Anàlisi detallada del mes seleccionat. |
| `/annual-goal` | Objectiu anual d'estalvi, propòsit, progrés i distribució. |
| `/data` | Gestió de dades: informes d'Excel i còpies completes de la base de dades en JSON. |
| `/register` | Creació, edició, desament i eliminació de tancaments mensuals. |

## Tecnologies

- Next.js amb App Router i Route Handlers.
- React.
- Electron i Electron Forge per a l'aplicació d'escriptori instal·lable.
- TypeScript amb comprovació estricta de tipus.
- Tailwind CSS i CSS global mitjançant PostCSS.
- Icones de Font Awesome i Lucide.
- Un petit generador d'XLSX inclòs al repositori; no cal cap biblioteca de fulls de càlcul.

## Requisits

- Node.js compatible amb la cadena d'eines actual d'Electron.
- npm, amb el fitxer `package-lock.json` inclòs.
- Un sistema de fitxers local amb permisos d'escriptura per a `data/homeflow.json`.

L'ús local no requereix variables d'entorn ni serveis externs.

## Instal·lació

Clona el repositori, entra al seu directori i instal·la les dependències bloquejades:

```bash
git clone https://github.com/abujalancej/homeflow.git
cd homeflow
npm ci
```

Si treballes des d'una còpia existent i vols que npm actualitzi deliberadament el fitxer de bloqueig, fes servir `npm install`.

## Desenvolupament

Inicia el servidor de desenvolupament:

```bash
npm run dev
```

Obre [http://localhost:3000](http://localhost:3000). El servidor de desenvolupament de Next.js aplica els canvis fets a l'aplicació.

## Compilació per a producció

Crea i executa una compilació optimitzada per a producció:

```bash
npm run build
npm start
```

`npm start` utilitza el port de producció predeterminat de Next.js, el `3000`.

## Aplicació d'escriptori

Executa HomeFlow en una finestra d'Electron durant el desenvolupament:

```bash
npm run desktop:dev
```

Crea una aplicació sense instal·lador o un paquet distribuïble per al sistema operatiu i l'arquitectura actuals:

```bash
npm run desktop:package
npm run desktop:make
```

Electron Forge desa les aplicacions i els instal·ladors generats a `out/`. Els formats configurats són DMG i ZIP a macOS, Squirrel i ZIP a Windows, i DEB, RPM i ZIP a Linux. Per empaquetar un altre sistema operatiu, normalment cal compilar en aquell mateix sistema. La signatura de codi i la notarització encara no estan configurades.

L'aplicació instal·lada inicia internament el servidor independent de Next.js en un port de bucle local disponible. El renderitzador utilitza aïllament de context, sandbox de processos, integració amb Node.js desactivada, sol·licituds de permisos denegades i navegació restringida. No necessita cap servidor extern.

## Ús

1. Obre **Registre** i selecciona un mes existent o crea'n un de nou.
2. Afegeix fonts d'ingressos, saldos de comptes, efectiu, cobraments pendents, pagaments reals pendents i els ajustos patrimonials necessaris.
3. Registra les compres estimades a **Compromisos futurs**. No afecten les xifres mensuals fins que fas servir **Converteix en deute real**.
4. Desa el tancament mensual. La versió web escriu el tancament i els compromisos futurs a `data/homeflow.json`; la versió d'escriptori utilitza el seu directori privat de dades de l'aplicació.
5. Fes servir **Resum** i **Anàlisi** per consultar el mes actiu. **Resum** també mostra els compromisos previstos de l'any actiu i la liquiditat disponible resultant sense comptar-los com a despesa actual.
6. Fes servir **Evolució** per comparar mètriques històriques en un interval recent, personalitzat o complet.
7. Fes servir **Previsió** per comparar possibles resultats de final d'any amb anys anteriors.
8. Obre **Meta anual**, tria un any i fes servir **Edita** per desbloquejar-ne el propòsit i el desglossament. Desa o cancel·la els canvis des de la barra de l'editor.
9. Des de **Dades**, baixa un llibre amb diversos fulls o exporta/importa la base de dades completa en JSON per traslladar-la entre instal·lacions.

A l'apartat **Dec** només hi han d'aparèixer factures o obligacions confirmades que continuïn pendents al tancament del mes. Els cobraments i pagaments pendents es copien en crear el mes següent i es mantenen fins que s'eliminen. Una despesa pagada durant el mes ja queda reflectida en els saldos bancaris del tancament i no s'ha d'afegir també com a deute pendent.

L'últim mes actiu es recorda a l'emmagatzematge local del navegador mitjançant `homeflow.activeMonth`, l'aparença seleccionada mitjançant `homeflow.theme` i la moneda de visualització mitjançant `homeflow.currency`. Les modificacions temporals de DEMO utilitzen l'emmagatzematge de sessió del navegador mitjançant `homeflow.demoStore`. Els registres financers es desen al sistema de fitxers del servidor, no al navegador.

Canviar entre EUR i USD modifica el símbol i el format que es mostren; no converteix els imports desats mitjançant un tipus de canvi.

## Emmagatzematge de dades

HomeFlow **no** utilitza PostgreSQL, SQLite, MySQL ni cap altre servidor de bases de dades. El seu magatzem persistent és el fitxer JSON següent:

```text
data/homeflow.json
```

A l'aplicació instal·lada amb Electron, el fitxer equivalent es desa dins del directori `userData` de cada usuari com a `data/homeflow.json` (per exemple, `~/Library/Application Support/HomeFlow/data/homeflow.json` a macOS). D'aquesta manera, els registres reals es mantenen fora del paquet de l'aplicació i del repositori. El procés d'escriptori utilitza aquesta ubicació automàticament, tret que `HOMEFLOW_DATA_DIR` indiqui expressament un altre directori.

La capa d'emmagatzematge del servidor s'implementa a `src/lib/homeflow-store.ts` i utilitza les API del sistema de fitxers de Node.js.

- El fitxer complet es llegeix quan l'aplicació carrega les dades.
- Els registres rebuts es normalitzen abans d'utilitzar-los.
- En desar o eliminar un registre es reescriu tot el document JSON.
- Si el fitxer no existeix, HomeFlow crea automàticament un magatzem buit vàlid.
- Tots els imports es desen com a nombres JSON.
- Els identificadors de mes utilitzen el format `YYYY-MM`.
- Les marques de temps utilitzen cadenes ISO 8601.

### Consideracions importants sobre l'emmagatzematge

- Fes una còpia de seguretat de `data/homeflow.json` abans de fer edicions massives, migracions o actualitzacions.
- El directori `data/` complet està exclòs de Git perquè els registres financers reals i les còpies automàtiques no es confirmin mai al repositori.
- La importació d'una còpia de seguretat JSON substitueix el magatzem actual després de validar-la i desa l'estat anterior a `data/homeflow.backup.json`.
- El fitxer pot contenir informació financera privada. Revisa'l abans de publicar o compartir el repositori.
- La implementació actual està dissenyada per a una instal·lació privada amb un únic procés. No proporciona bloqueig de fitxers ni escriptures concurrents transaccionals.
- L'allotjament en producció ha de proporcionar un sistema de fitxers persistent amb permisos d'escriptura. Els sistemes de fitxers efímers o de només lectura perdran els canvis; migra el magatzem a una base de dades duradora abans d'utilitzar una plataforma d'aquest tipus.
- L'aplicació no disposa d'autenticació ni separació d'usuaris. No l'exposis públicament sense afegir-hi una capa de control d'accés.

## Model de dades

El magatzem conté tres col·leccions de nivell superior:

```json
{
  "months": [],
  "annualGoals": [],
  "futureCommitments": []
}
```

Un tancament mensual té l'estructura següent:

```json
{
  "id": "2026-08",
  "month": "2026-08",
  "income": 0,
  "incomeEntries": [
    { "id": "income-1", "name": "Nòmina", "amount": 0 }
  ],
  "cash": 0,
  "cashEntries": [
    { "id": "cash-1", "name": "Efectiu", "amount": 0 }
  ],
  "accounts": [
    { "id": "account-1", "name": "Compte corrent", "balance": 0 }
  ],
  "receivables": [],
  "payables": [],
  "adjustments": [],
  "notes": "Nota mensual opcional",
  "updatedAt": "2026-08-25T10:00:00.000Z"
}
```

Un compromís futur és independent dels tancaments mensuals:

```json
{
  "id": "commitment-1",
  "name": "Persianes",
  "amount": 3000,
  "status": "planned",
  "targetMonth": "2026-11",
  "note": "Import estimat",
  "updatedAt": "2026-08-27T10:00:00.000Z"
}
```

El seu estat pot ser `planned` o `committed`. El mes previst i la nota són opcionals. Els compromisos futurs són informatius i no intervenen en el patrimoni, l'estalvi, la despesa ni la taxa d'estalvi.

Un objectiu anual conté un propòsit i un desglossament d'assignacions:

```json
{
  "id": "goal-2026",
  "year": 2026,
  "targetSavings": 12000,
  "purpose": "Estalvi anual",
  "allocations": [
    {
      "id": "allocation-1",
      "name": "Fons d'emergència",
      "amount": 12000,
      "accumulates": true
    }
  ],
  "updatedAt": "2026-08-25T10:00:00.000Z"
}
```

`income` i `cash` es recalculen a partir de les seves llistes d'entrades. El camp `targetSavings` d'un objectiu anual es recalcula a partir de les seves assignacions quan es normalitza el magatzem.

## Càlculs financers

Per a cada tancament mensual, HomeFlow calcula:

```text
total en comptes = suma dels saldos dels comptes
liquiditat       = total en comptes + efectiu
patrimoni net    = liquiditat + cobraments pendents - pagaments pendents
estalvi real     = patrimoni actual - patrimoni anterior
estalvi operatiu = estalvi real + ajustos patrimonials
despesa estimada = ingressos - estalvi operatiu
taxa d'estalvi   = estalvi operatiu / ingressos
```

La despesa estimada i la taxa d'estalvi només es calculen quan els ingressos són superiors a zero. Els valors d'estalvi no estan disponibles per al primer mes registrat perquè no hi ha cap tancament anterior amb què comparar-los.

Els compromisos futurs queden exclosos d'aquestes fórmules. La interfície en mostra per separat el total i el valor informatiu `liquiditat - compromisos futurs`. En convertir un compromís, aquest passa a **Dec** al mes actiu i comença a intervenir en els càlculs financers.

La previsió pren el patrimoni net del mes actiu i hi aplica l'estalvi operatiu registrat durant els mesos restants de cada any anterior. Aquests escenaris històrics generen estimacions mínima, mitjana i màxima per al tancament anual. Cada resum també mostra l'import acumulable i el disponible després de restar els compromisos futurs el mes previst dels quals pertany a l'any de la previsió. Els compromisos sense data no s'assignen automàticament a cap any. Aquestes estimacions no constitueixen assessorament financer predictiu.

## API

Totes les rutes de l'API utilitzen l'entorn d'execució de Node.js i es renderitzen dinàmicament.

| Mètode | Punt d'accés | Descripció |
| --- | --- | --- |
| `GET` | `/api/months` | Retorna tot el magatzem. |
| `POST` | `/api/months` | Crea o substitueix un tancament mensual i retorna el magatzem actualitzat. |
| `DELETE` | `/api/months?id=YYYY-MM` | Elimina un tancament mensual i retorna el magatzem actualitzat. |
| `GET` | `/api/goals` | Retorna la col·lecció d'objectius anuals. |
| `POST` | `/api/goals` | Crea o substitueix un objectiu anual i retorna el magatzem actualitzat. |
| `GET` | `/api/commitments` | Retorna la col·lecció de compromisos futurs. |
| `PUT` | `/api/commitments` | Substitueix la col·lecció de compromisos futurs i retorna el magatzem actualitzat. |
| `GET` | `/api/export?from=YYYY-MM&to=YYYY-MM` | Baixa un llibre d'Excel per a l'interval de mesos, ambdós inclosos. |
| `GET` | `/api/data` | Baixa en JSON una còpia de seguretat completa de la base de dades. |
| `POST` | `/api/data` | Valida i importa una còpia de seguretat de la base de dades, després de desar una còpia del magatzem actual. |

El punt d'accés d'exportació accepta un, tots dos o cap dels paràmetres de l'interval. Sense paràmetres, exporta tot l'historial.

El llibre generat conté aquests fulls:

- Resum mensual.
- Ingressos.
- Comptes.
- Efectiu.
- Cobraments i pagaments pendents.
- Ajustos patrimonials.
- Compromisos futurs.
- Objectius anuals.

## Estructura del projecte

```text
homeflow/
├── assets/                    # Icones generades per a l'escriptori
├── electron/
│   ├── main.cjs              # Procés principal segur i servidor integrat
│   └── preload.cjs           # Pont mínim i aïllat del renderitzador
├── README.md                  # Documentació en anglès
├── README.es.md               # Documentació en castellà
├── README.ca.md               # Documentació en català
├── data/
│   └── homeflow.json          # Magatzem financer persistent
├── public/
│   ├── homeflow-logo.png      # Recurs de marca transparent de HomeFlow
│   └── homeflow-logo-bg.png   # Logo de HomeFlow amb fons gris
│   └── homeflow-logo-rounded.png # Icona de HomeFlow amb cantonades arrodonides
├── scripts/
│   ├── generate-desktop-icons.cjs
│   └── prepare-electron.cjs   # Copia els recursos estàtics a la compilació independent
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── commitments/route.ts
│   │   │   ├── data/route.ts
│   │   │   ├── export/route.ts
│   │   │   ├── goals/route.ts
│   │   │   └── months/route.ts
│   │   ├── analysis/page.tsx
│   │   ├── annual-goal/page.tsx
│   │   ├── data/page.tsx
│   │   ├── evolution/page.tsx
│   │   ├── forecast/page.tsx
│   │   ├── register/page.tsx
│   │   ├── favicon.ico
│   │   ├── globals.css
│   │   ├── homeflow-app.tsx   # Aplicació client i vistes compartides
│   │   ├── layout.tsx
│   │   └── page.tsx           # Ruta del resum
│   └── lib/
│       ├── homeflow-math.ts   # Càlculs financers i format de dates
│       ├── homeflow-store.ts  # Persistència JSON i normalització de dades d'entrada
│       ├── homeflow-types.ts  # Tipus del domini
│       └── xlsx-export.ts     # Generació d'XLSX sense dependències
├── eslint.config.mjs
├── forge.config.cjs           # Paquets multiplataforma d'Electron Forge
├── next.config.ts             # Sortida independent de Next.js
├── package.json
├── postcss.config.mjs
└── tsconfig.json
```

Cada ruta de pàgina renderitza l'aplicació client compartida amb una vista diferent. L'accés a les dades es manté als Route Handlers del servidor, mentre que els càlculs i els tipus del domini es troben a `src/lib`.

## Scripts disponibles

| Ordre | Descripció |
| --- | --- |
| `npm run dev` | Inicia el servidor de desenvolupament local al port predeterminat de Next.js, el `3000`. |
| `npm run lint` | Executa ESLint amb les regles de Next.js i TypeScript. |
| `npm run build` | Crea una compilació de producció amb webpack. |
| `npm start` | Inicia el servidor de producció compilat. |
| `npm run desktop:dev` | Inicia Next.js i Electron alhora per desenvolupar l'aplicació d'escriptori. |
| `npm run desktop:icons` | Regenera les icones d'escriptori a macOS. |
| `npm run desktop:build` | Crea i prepara la compilació independent de Next.js que utilitza Electron. |
| `npm run desktop:package` | Crea una aplicació Electron sense instal·lador per a la plataforma actual. |
| `npm run desktop:make` | Crea instal·ladors o fitxers distribuïbles per a la plataforma actual. |

## Validació

Abans de confirmar els canvis, executa:

```bash
npm run lint
npm run build
npm run desktop:package
```

Actualment, el repositori no conté cap conjunt automatitzat de proves unitàries ni d'extrem a extrem.

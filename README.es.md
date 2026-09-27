# HomeFlow

[English](README.md) · **Español** · [Català](README.ca.md)

<p align="center">
  <img src="public/homeflow-logo-rounded.png" alt="Logo de HomeFlow" width="220">
</p>

HomeFlow es una aplicación privada de finanzas domésticas para registrar mensualmente saldos de cuentas, efectivo, ingresos, cobros pendientes, pagos pendientes, ajustes patrimoniales y objetivos anuales de ahorro.

La aplicación representa la situación económica del hogar mediante cierres mensuales, no como un libro de movimientos. A partir de esos cierres, HomeFlow calcula el patrimonio neto, el ahorro real y operativo, el gasto estimado, la tasa de ahorro, la evolución histórica y distintos escenarios de previsión al final del año.

La interfaz admite castellano, catalán e inglés, adapta el formato de las fechas al idioma seleccionado y muestra los importes en euros o dólares estadounidenses.

## Funcionalidades

- Fotografías mensuales del balance doméstico.
- Múltiples cuentas bancarias, fuentes de ingresos y entradas de efectivo.
- Seguimiento de cobros y pagos pendientes.
- Compromisos futuros que no afectan al cálculo mensual hasta convertirse en una deuda real.
- Ajustes patrimoniales para amortizaciones de hipoteca u otros cambios no operativos.
- Cálculo de patrimonio neto, liquidez, ahorro, gasto estimado y tasa de ahorro.
- Gráficos históricos con intervalos de fechas personalizados y métricas seleccionables.
- Previsiones de cierre anual basadas en el ahorro registrado en años anteriores.
- Objetivos anuales de ahorro con asignaciones acumulables y no acumulables.
- Informes Excel con varias hojas para un intervalo de meses.
- Exportación e importación de la base de datos completa en JSON, con copia de seguridad automática antes de importar.
- Pantalla de bienvenida de marca durante la carga inicial de la aplicación.
- Datos de demostración editables, aislados de los registros reales y guardados únicamente durante la sesión de la pestaña actual.
- Modos de apariencia claro y oscuro con persistencia local.
- Preferencia persistente para mostrar los importes en EUR o USD.
- Interfaz localizada en castellano, catalán e inglés.
- Persistencia local en JSON, sin base de datos externa ni backend en Python.

## Rutas de la aplicación

| Ruta | Finalidad |
| --- | --- |
| `/` | Resumen del mes activo. |
| `/evolution` | Evolución histórica del patrimonio, ahorro, ingresos o gasto estimado. |
| `/forecast` | Escenarios de cierre anual basados en años anteriores. |
| `/analysis` | Análisis detallado del mes seleccionado. |
| `/annual-goal` | Objetivo anual de ahorro, propósito, progreso y distribución. |
| `/data` | Gestión de datos: informes Excel y copias completas de la base de datos en JSON. |
| `/register` | Creación, edición, guardado y eliminación de cierres mensuales. |

## Tecnologías

- Next.js con App Router y Route Handlers.
- React.
- Electron y Electron Forge para la aplicación de escritorio instalable.
- TypeScript con comprobación estricta de tipos.
- Tailwind CSS y CSS global mediante PostCSS.
- Iconos de Font Awesome y Lucide.
- Un pequeño generador XLSX incluido en el repositorio; no necesita una biblioteca de hojas de cálculo.

## Requisitos

- Node.js compatible con la cadena de herramientas actual de Electron.
- npm, utilizando el archivo `package-lock.json` incluido.
- Un sistema de archivos local con permisos de escritura para `data/homeflow.json`.

El uso local no requiere variables de entorno ni servicios externos.

## Instalación

Clona el repositorio, entra en su directorio e instala las dependencias bloqueadas:

```bash
git clone https://github.com/abujalancej/homeflow.git
cd homeflow
npm ci
```

Si trabajas desde una copia existente y quieres que npm actualice deliberadamente el archivo de bloqueo, utiliza `npm install` en su lugar.

## Desarrollo

Inicia el servidor de desarrollo:

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). El servidor de desarrollo de Next.js aplica los cambios realizados en la aplicación.

## Compilación para producción

Crea y ejecuta una compilación optimizada para producción:

```bash
npm run build
npm start
```

`npm start` utiliza el puerto de producción predeterminado de Next.js, el `3000`.

## Aplicación de escritorio

Ejecuta HomeFlow en una ventana de Electron durante el desarrollo:

```bash
npm run desktop:dev
```

Crea una aplicación sin instalador o un paquete distribuible para el sistema operativo y la arquitectura actuales:

```bash
npm run desktop:package
npm run desktop:make
```

Los artefactos de escritorio se agrupan en `out/` por plataforma: `out/mac/` para macOS, `out/win/` para Windows y `out/linux/` para Linux. Los archivos DMG, EXE y ZIP usan `HomeFlow-<version>-<os>-<arch>.<ext>`. Electron Forge genera los DMG y ZIP de macOS en `out/mac/`. Para empaquetar otro sistema operativo normalmente hay que compilar en ese mismo sistema. La firma de código y la notarización todavía no están configuradas.

Para crear directamente desde macOS un instalador `.exe` de Windows x64, ejecuta:

```bash
npm run desktop:make:win
```

Usa las herramientas de compatibilidad Wine de electron-builder y deja el instalador y la aplicación descomprimida en `out/win/`. En Apple Silicon debe estar disponible Rosetta. Prueba el instalador generado en Windows antes de distribuirlo; no está firmado.

La aplicación instalada inicia internamente el servidor independiente de Next.js en un puerto de bucle local disponible. El renderizador utiliza aislamiento de contexto, sandbox de procesos, integración con Node.js desactivada, solicitudes de permisos denegadas y navegación restringida. No necesita ningún servidor externo.

## Uso

1. Abre **Registro** y selecciona un mes existente o crea uno nuevo.
2. Añade fuentes de ingresos, saldos de cuentas, efectivo, cobros pendientes, pagos reales pendientes y los ajustes patrimoniales necesarios.
3. Registra las compras estimadas en **Compromisos futuros**. No afectan a las cifras mensuales hasta utilizar **Convertir en deuda real**.
4. Guarda el cierre mensual. La versión web escribe el cierre y los compromisos futuros en `data/homeflow.json`; la versión de escritorio utiliza su directorio privado de datos de aplicación.
5. Utiliza **Resumen** y **Análisis** para consultar el mes activo. **Resumen** también muestra los compromisos previstos del año activo y la liquidez disponible resultante sin contarlos como gasto actual.
6. Utiliza **Evolución** para comparar métricas históricas en un intervalo reciente, personalizado o completo.
7. Utiliza **Previsión** para comparar posibles resultados al final del año con años anteriores.
8. Abre **Meta anual**, elige un año y utiliza **Editar** para desbloquear su propósito y desglose. Guarda o cancela los cambios desde la barra del editor.
9. Desde **Datos**, descarga un libro con varias hojas o exporta/importa la base de datos completa en JSON para moverla entre instalaciones.

En **Debo** solo deben aparecer facturas u obligaciones confirmadas que continúen pendientes al cierre del mes. Los cobros y pagos pendientes se copian al crear el mes siguiente y permanecen hasta eliminarlos. Un gasto pagado durante el mes ya está reflejado en los saldos bancarios del cierre y no debe añadirse también como deuda pendiente.

El último mes activo se recuerda en el almacenamiento local del navegador mediante `homeflow.activeMonth`, la apariencia seleccionada mediante `homeflow.theme` y la moneda de visualización mediante `homeflow.currency`. Las modificaciones temporales de DEMO utilizan el almacenamiento de sesión del navegador mediante `homeflow.demoStore`. Los registros financieros se guardan en el sistema de archivos del servidor, no en el navegador.

Cambiar entre EUR y USD modifica el símbolo y el formato mostrado; no convierte los importes guardados mediante un tipo de cambio.

## Almacenamiento de datos

HomeFlow **no** utiliza PostgreSQL, SQLite, MySQL ni otro servidor de bases de datos. Su almacén persistente es el siguiente archivo JSON:

```text
data/homeflow.json
```

En la aplicación instalada con Electron, el archivo equivalente se guarda dentro del directorio `userData` de cada usuario como `data/homeflow.json` (por ejemplo, `~/Library/Application Support/HomeFlow/data/homeflow.json` en macOS). De este modo, los registros reales permanecen fuera del paquete de la aplicación y del repositorio. El proceso de escritorio utiliza esa ubicación automáticamente, salvo que `HOMEFLOW_DATA_DIR` indique expresamente otro directorio.

La capa de almacenamiento del servidor se implementa en `src/lib/homeflow-store.ts` y utiliza las API del sistema de archivos de Node.js.

- El archivo completo se lee cuando la aplicación carga los datos.
- Los registros recibidos se normalizan antes de usarse.
- Al guardar o eliminar un registro se reescribe el documento JSON completo.
- Si el archivo no existe, HomeFlow crea automáticamente un almacén vacío válido.
- Todos los importes se guardan como números JSON.
- Los identificadores de mes utilizan el formato `YYYY-MM`.
- Las marcas de tiempo utilizan cadenas ISO 8601.

### Consideraciones importantes sobre el almacenamiento

- Haz una copia de seguridad de `data/homeflow.json` antes de realizar ediciones masivas, migraciones o actualizaciones.
- El directorio `data/` completo está excluido de Git para que los registros financieros reales y las copias automáticas nunca se confirmen en el repositorio.
- La importación de un respaldo JSON sustituye el almacén actual después de validarlo y guarda el estado anterior en `data/homeflow.backup.json`.
- El archivo puede contener información financiera privada. Revísalo antes de publicar o compartir el repositorio.
- La implementación actual está diseñada para una instalación privada con un único proceso. No proporciona bloqueo de archivos ni escrituras concurrentes transaccionales.
- El alojamiento en producción debe proporcionar un sistema de archivos persistente con permisos de escritura. Los sistemas de archivos efímeros o de solo lectura perderán los cambios; migra el almacén a una base de datos duradera antes de utilizar una plataforma de ese tipo.
- La aplicación no dispone de autenticación ni separación de usuarios. No la expongas públicamente sin añadir una capa de control de acceso.

## Modelo de datos

El almacén contiene tres colecciones de nivel superior:

```json
{
  "months": [],
  "annualGoals": [],
  "futureCommitments": []
}
```

Un cierre mensual tiene la siguiente estructura:

```json
{
  "id": "2026-08",
  "month": "2026-08",
  "income": 0,
  "incomeEntries": [
    { "id": "income-1", "name": "Nómina", "amount": 0 }
  ],
  "cash": 0,
  "cashEntries": [
    { "id": "cash-1", "name": "Efectivo", "amount": 0 }
  ],
  "accounts": [
    { "id": "account-1", "name": "Cuenta corriente", "balance": 0 }
  ],
  "receivables": [],
  "payables": [],
  "adjustments": [],
  "notes": "Nota mensual opcional",
  "updatedAt": "2026-08-25T10:00:00.000Z"
}
```

Un compromiso futuro es independiente de los cierres mensuales:

```json
{
  "id": "commitment-1",
  "name": "Persianas",
  "amount": 3000,
  "status": "planned",
  "targetMonth": "2026-11",
  "note": "Importe estimado",
  "updatedAt": "2026-08-27T10:00:00.000Z"
}
```

Su estado puede ser `planned` o `committed`. El mes previsto y la nota son opcionales. Los compromisos futuros son informativos y no participan en el patrimonio, ahorro, gasto ni tasa de ahorro.

Un objetivo anual contiene un propósito y una distribución de asignaciones:

```json
{
  "id": "goal-2026",
  "year": 2026,
  "targetSavings": 12000,
  "purpose": "Ahorro anual",
  "allocations": [
    {
      "id": "allocation-1",
      "name": "Fondo de emergencia",
      "amount": 12000,
      "accumulates": true
    }
  ],
  "updatedAt": "2026-08-25T10:00:00.000Z"
}
```

`income` y `cash` se recalculan a partir de sus listas de entradas. El `targetSavings` de un objetivo anual se recalcula a partir de sus asignaciones al normalizar el almacén.

## Cálculos financieros

Para cada cierre mensual, HomeFlow calcula:

```text
total en cuentas = suma de los saldos de las cuentas
liquidez         = total en cuentas + efectivo
patrimonio neto  = liquidez + cobros pendientes - pagos pendientes
ahorro real      = patrimonio actual - patrimonio anterior
ahorro operativo = ahorro real + ajustes patrimoniales
gasto estimado   = ingresos - ahorro operativo
tasa de ahorro   = ahorro operativo / ingresos
```

El gasto estimado y la tasa de ahorro solo se calculan cuando los ingresos son superiores a cero. Los valores de ahorro no están disponibles para el primer mes registrado porque no existe un cierre anterior con el que compararlos.

Los compromisos futuros quedan fuera de estas fórmulas. La interfaz muestra por separado su total y el valor informativo `liquidez - compromisos futuros`. Al convertir un compromiso, este pasa a **Debo** en el mes activo y empieza a intervenir en los cálculos financieros.

La previsión toma el patrimonio neto del mes activo y aplica el ahorro operativo registrado en los meses restantes de cada año anterior. Esos escenarios históricos producen estimaciones mínimas, medias y máximas para el cierre anual. Cada resumen muestra también el importe acumulable y el disponible tras restar los compromisos futuros cuyo mes previsto pertenece al año de la previsión. Los compromisos sin fecha no se asignan automáticamente a ningún año. Estas estimaciones no constituyen asesoramiento financiero predictivo.

## API

Todas las rutas de la API utilizan el entorno de ejecución de Node.js y se renderizan dinámicamente.

| Método | Endpoint | Descripción |
| --- | --- | --- |
| `GET` | `/api/months` | Devuelve el almacén completo. |
| `POST` | `/api/months` | Crea o sustituye un cierre mensual y devuelve el almacén actualizado. |
| `DELETE` | `/api/months?id=YYYY-MM` | Elimina un cierre mensual y devuelve el almacén actualizado. |
| `GET` | `/api/goals` | Devuelve la colección de objetivos anuales. |
| `POST` | `/api/goals` | Crea o sustituye un objetivo anual y devuelve el almacén actualizado. |
| `GET` | `/api/commitments` | Devuelve la colección de compromisos futuros. |
| `PUT` | `/api/commitments` | Sustituye la colección de compromisos futuros y devuelve el almacén actualizado. |
| `GET` | `/api/export?from=YYYY-MM&to=YYYY-MM` | Descarga un libro de Excel para el intervalo inclusivo de meses. |
| `GET` | `/api/data` | Descarga en JSON un respaldo completo de la base de datos. |
| `POST` | `/api/data` | Valida e importa un respaldo de la base de datos y guarda antes el almacén actual. |

El endpoint de exportación acepta uno, ambos o ninguno de los parámetros del intervalo. Sin parámetros, exporta todo el historial.

El libro generado contiene estas hojas:

- Resumen mensual.
- Ingresos.
- Cuentas.
- Efectivo.
- Cobros y pagos pendientes.
- Ajustes patrimoniales.
- Compromisos futuros.
- Objetivos anuales.

## Estructura del proyecto

```text
homeflow/
├── assets/                    # Iconos generados para escritorio
├── electron/
│   ├── main.cjs              # Proceso principal seguro y servidor integrado
│   └── preload.cjs           # Puente mínimo y aislado del renderizador
├── README.md                  # Documentación en inglés
├── README.es.md               # Documentación en castellano
├── README.ca.md               # Documentación en catalán
├── data/
│   └── homeflow.json          # Almacén financiero persistente
├── public/
│   ├── homeflow-logo.png      # Recurso de marca transparente de HomeFlow
│   └── homeflow-logo-bg.png   # Logo de HomeFlow con fondo gris
│   └── homeflow-logo-rounded.png # Icono de HomeFlow con esquinas redondeadas
├── scripts/
│   ├── generate-desktop-icons.cjs
│   └── prepare-electron.cjs   # Copia los recursos estáticos al build independiente
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
│   │   ├── homeflow-app.tsx   # Aplicación cliente y vistas compartidas
│   │   ├── layout.tsx
│   │   └── page.tsx           # Ruta del resumen
│   └── lib/
│       ├── homeflow-math.ts   # Cálculos financieros y formato de fechas
│       ├── homeflow-store.ts  # Persistencia JSON y normalización de entradas
│       ├── homeflow-types.ts  # Tipos del dominio
│       └── xlsx-export.ts     # Generación XLSX sin dependencias
├── eslint.config.mjs
├── forge.config.cjs           # Paquetes multiplataforma de Electron Forge
├── next.config.ts             # Salida independiente de Next.js
├── package.json
├── postcss.config.mjs
└── tsconfig.json
```

Cada ruta de página renderiza la aplicación cliente compartida con una vista diferente. El acceso a los datos permanece en los Route Handlers del servidor, mientras que los cálculos y los tipos del dominio se encuentran en `src/lib`.

## Scripts disponibles

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Inicia el servidor de desarrollo local en el puerto predeterminado de Next.js, el `3000`. |
| `npm run lint` | Ejecuta ESLint con las reglas de Next.js y TypeScript. |
| `npm run build` | Crea una compilación de producción utilizando webpack. |
| `npm start` | Inicia el servidor de producción compilado. |
| `npm run desktop:dev` | Inicia Next.js y Electron juntos para desarrollar la aplicación de escritorio. |
| `npm run desktop:icons` | Regenera los iconos de escritorio en macOS. |
| `npm run desktop:build` | Crea y prepara el build independiente de Next.js que utiliza Electron. |
| `npm run desktop:package` | Crea una aplicación Electron sin instalador para la plataforma actual. |
| `npm run desktop:make` | Crea instaladores o archivos distribuibles para la plataforma actual. |
| `npm run desktop:make:win` | Crea un instalador `.exe` de Windows x64 desde macOS. |

## Validación

Antes de confirmar cambios, ejecuta:

```bash
npm run lint
npm run build
npm run desktop:package
```

Actualmente el repositorio no contiene una batería automatizada de pruebas unitarias ni de extremo a extremo.

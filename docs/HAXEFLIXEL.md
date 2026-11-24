# HaxeFlixel para los minijuegos

Los cuatro minijuegos independientes usan un único runtime HTML5 compilado con HaxeFlixel: Persecución, Cacería, Emboscada y Breaking Race. Cada modo se instancia como un estado HaxeFlixel distinto. La interfaz de navegación, los paneles de instrucciones, el idioma y la integración con el menú continúan en JavaScript/Vite.

La Campaña sigue ejecutándose en su Canvas y en sus sistemas actuales. No se importa HaxeFlixel en su bucle de juego ni se modifican sus sistemas de progresión o guardado.

## Toolchain

GitHub Actions instala Haxe 4.3.7 y Neko 2.4.1. Vercel usa el Haxe/Neko preinstalado en Amazon Linux 2023. El instalador localiza el ejecutable Haxe dentro de `HAXE_STD_PATH` o del toolcache de Vercel, porque el proveedor puede no agregar esa carpeta a `PATH`. No descarga el binario standalone de Haxe 4.3.7 en Vercel: ese artefacto requiere GLIBC 2.35 y no arranca sobre la GLIBC 2.34 de Amazon Linux 2023.

Las librerías se fijan en Lime 8.3.2, OpenFL 9.5.2, hxcpp 4.3.2 y HaxeFlixel 6.2.1.

## Compilación local y CI

```bash
bash scripts/build-haxeflixel.sh
VITE_HAXEFLIXEL=1 npm run build
```

## Despliegue en Vercel

Vercel instala cabeceras nativas mediante `dnf`, descarga el código fuente y los submódulos de Lime 8.3.2 y recompila `lime.ndll` dentro del builder. El script comprueba que el resultado no requiera GLIBC 2.35 ni tenga dependencias dinámicas sin resolver antes de compilar el runtime HTML5.

```bash
bash scripts/build-vercel.sh
```

GitHub Actions continúa usando el binario publicado de Lime en Ubuntu, donde ya está verificado. Vercel recompila únicamente el helper nativo incompatible con su glibc.

## Comunicación

El host JavaScript envía comandos `open`, `start`, `pause`, `resume`, `locale` y `exit` mediante `postMessage`. El runtime devuelve eventos de listo, pausa, finalización y salida. Así se mantiene un único contexto de motor y no se crean cuatro instancias WebGL simultáneas.

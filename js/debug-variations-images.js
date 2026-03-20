/**
 * DEBUG SCRIPT - Variaciones con Imágenes
 * Ayuda a diagnosticar problemas con imágenes de variaciones en la galería
 */

console.log('=== DEBUG VARIACIONES IMÁGENES ===');

document.addEventListener('DOMContentLoaded', async () => {
  // Esperar a que se cargue un producto
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Función para debuguear cuando se abre un modal de producto
  window.debugVariationImages = async function(productId) {
    console.log(`\n📦 Debugueando producto ID: ${productId}`);

    if (!window.supabase) {
      console.error('❌ Supabase no disponible');
      return;
    }

    try {
      // 1. Cargar el producto
      const { data: product, error: productErr } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (productErr) {
        console.error('❌ Error cargando producto:', productErr);
        return;
      }

      console.log('✅ Producto cargado:', product.name);

      // 2. Cargar variaciones
      const { data: variations, error: varErr } = await supabase
        .from('product_variations')
        .select('*')
        .eq('parent_product_id', productId);

      if (varErr) {
        console.error('❌ Error cargando variaciones:', varErr);
        return;
      }

      console.log(`✅ Variaciones encontradas: ${variations?.length || 0}`);

      if (!variations || variations.length === 0) {
        console.warn('⚠️  No hay variaciones para este producto');
        return;
      }

      // 3. Analizar cada variación
      console.log('\n📊 Análisis de variaciones:');
      variations.forEach((v, idx) => {
        console.log(`\n  Variación ${idx + 1}:`);
        console.log(`    - SKU: ${v.sku}`);
        console.log(`    - Color: ${v.color}`);
        console.log(`    - Talla: ${v.talla}`);
        console.log(`    - Stock: ${v.stock}`);
        console.log(`    - Precio: ${v.price}`);
        console.log(`    - Imagen URL: ${v.image_url || '❌ NO TIENE'}`);
        
        if (v.image_url) {
          console.log(`      ✅ Imagen disponible: ${v.image_url.substring(0, 50)}...`);
        }
      });

      // 4. Verificar si tienda-variations-enhancement.js está activo
      console.log('\n🔧 Verificación de módulos:');
      console.log(`  - window.Variations: ${window.Variations ? '✅' : '❌'}`);
      console.log(`  - window.VariationsUI: ${window.VariationsUI ? '✅' : '❌'}`);
      console.log(`  - window.switchToVariationImage: ${window.switchToVariationImage ? '✅' : '❌'}`);

      // 5. Verificar estado del modal
      const modal = document.getElementById('product-modal');
      const carousel = document.getElementById('modal-carousel-inner');
      
      console.log('\n📱 Estado del modal:');
      console.log(`  - Modal encontrado: ${modal ? '✅' : '❌'}`);
      console.log(`  - Carousel encontrado: ${carousel ? '✅' : '❌'}`);
      
      if (carousel) {
        const images = carousel.querySelectorAll('img');
        console.log(`  - Imágenes en carousel: ${images.length}`);
        images.forEach((img, i) => {
          console.log(`    ${i + 1}. ${img.src.substring(0, 50)}...`);
        });
      }

      // 6. Test del switchToVariationImage
      console.log('\n🧪 Test switchToVariationImage:');
      if (window.switchToVariationImage && variations.length > 0 && variations[0].image_url) {
        console.log(`  📍 Intentando cambiar a imagen de primera variación...`);
        window.switchToVariationImage(variations[0].image_url);
        console.log(`  ✅ Función llamada`);
      } else {
        console.warn(`  ⚠️  No se puede hacer test (falta switchToVariationImage o variaciones sin imagen)`);
      }

      console.log('\n=== FIN DEBUG ===\n');

    } catch (err) {
      console.error('❌ Error en debug:', err);
    }
  };

  // Interceptar openProductModal original para auto-debug
  const originalOpenProductModal = window.openProductModal;
  let debugMode = localStorage.getItem('debugVariationsMode') === 'on';

  if (debugMode && originalOpenProductModal) {
    window.openProductModal = function(productId) {
      console.log('🔍 Modal abierto, ejecutando debug...');
      window.debugVariationImages(productId);
      return originalOpenProductModal.call(this, productId);
    };
    console.log('✅ Modo debug ACTIVADO. Las variaciones se debuguearán al abrir cada producto');
  } else {
    console.log('ℹ️  Modo debug: OFF');
    console.log('   Para activar: localStorage.setItem("debugVariationsMode", "on")');
  }

  // Exponer función globalmente
  window.debugVariationImages = window.debugVariationImages;
});

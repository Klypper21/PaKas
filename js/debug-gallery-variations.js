/**
 * DEBUG COMPLETO: Galería de Variaciones
 * Verifica exactamente qué imágenes se cargan en el modal
 */

window.debugGalleryVariations = async function(productId) {
  console.log('\n=== DEBUG GALERÍA DE VARIACIONES ===');
  console.log(`📦 Producto ID: ${productId}\n`);

  if (!window.supabase) {
    console.error('❌ Supabase no disponible');
    return;
  }

  try {
    // 1. Obtener el producto
    const { data: product } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (!product) {
      console.error('❌ Producto no encontrado');
      return;
    }

    console.log('✅ Producto:', product.name);
    console.log(`   - Imagen principal: ${product.image_url ? '✅' : '❌'}`);
    console.log(`   - Extras: ${product.extra_images ? 'Sí' : 'No'}\n`);

    // 2. Procesar imagen principal
    let allImages = [product.image_url];
    console.log('📊 GALERÍA INICIAL:');
    console.log(`   1. Principal: ${product.image_url}`);

    // 3. Procesar imágenes extras
    const extraImages = Array.isArray(product.extra_images)
      ? product.extra_images
      : typeof product.extra_images === 'string'
        ? JSON.parse(product.extra_images || '[]')
        : [];

    console.log(`   2. Extras (${extraImages.length}):`);
    extraImages.forEach((img, i) => {
      console.log(`      - Extra ${i + 1}: ${img}`);
      if (!allImages.includes(img)) {
        allImages.push(img);
      }
    });

    // 4. Obtener TODAS las variaciones
    console.log('\n📥 CARGANDO VARIACIONES...');
    const { data: allVariations, error: varError } = await supabase
      .from('product_variations')
      .select('*')
      .eq('parent_product_id', productId);

    if (varError) {
      console.error(`❌ Error: ${varError.message}`);
      return;
    }

    console.log(`✅ Variaciones encontradas: ${allVariations?.length || 0}\n`);

    // 5. Analizar cada variación
    if (allVariations && allVariations.length > 0) {
      console.log('📋 ANÁLISIS POR VARIACIÓN:');
      
      allVariations.forEach((v, idx) => {
        console.log(`\n   Variación ${idx + 1}: ${v.color}-${v.talla}`);
        console.log(`   - SKU: ${v.sku}`);
        console.log(`   - Precio: ${v.price}`);
        console.log(`   - Stock: ${v.stock}`);
        console.log(`   - image_url EN BD: ${v.image_url ? '✅ ' + v.image_url.substring(0, 60) + '...' : '❌ NULL/VACÍO'}`);
        
        if (v.image_url && v.image_url.trim()) {
          if (!allImages.includes(v.image_url)) {
            allImages.push(v.image_url);
            console.log(`   🖼️  AGREGADA A GALERÍA`);
          } else {
            console.log(`   ⚠️  Ya estaba en galería`);
          }
        }
      });
    }

    // 6. Resumen final
    console.log(`\n📸 GALERÍA FINAL:`);
    console.log(`   Total de imágenes: ${allImages.length}`);
    console.log(`   - Imagen principal: 1`);
    console.log(`   - Imágenes extras: ${extraImages.length}`);
    console.log(`   - Imágenes de variaciones: ${allVariations ? allVariations.filter(v => v.image_url).length : 0}`);
    
    console.log(`\n📋 LISTA COMPLETA DE IMÁGENES EN GALERÍA:`);
    allImages.forEach((img, i) => {
      console.log(`   ${i + 1}. ${img.substring(0, 70)}`);
    });

    // 7. Problema detectado
    const variationsWithImage = allVariations ? allVariations.filter(v => v.image_url).length : 0;
    
    console.log(`\n🔍 DIAGNÓSTICO:`);
    if (variationsWithImage === 0) {
      console.error(`❌ PROBLEMA: No hay variaciones con imagen_url en la BD`);
      console.error(`   Esto significa que las imágenes NO se guardaron en admin`);
    } else {
      console.log(`✅ Hay ${variationsWithImage} variaciones con imagen`);
      console.log(`   Las imágenes sí se guardaron en BD`);
      console.log(`   Si no aparecen en galería, es problema de código`);
    }

    console.log('\n=== FIN DEBUG ===\n');

  } catch (err) {
    console.error('❌ Error en debug:', err);
  }
};

// Auto-ejecutar cuando se carga
document.addEventListener('DOMContentLoaded', () => {
  console.log('✅ Debug script cargado');
  console.log('📌 Usa: window.debugGalleryVariations(productId)');
  console.log('   Ejemplo: window.debugGalleryVariations(1)');
});

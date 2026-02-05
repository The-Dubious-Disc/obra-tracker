#!/usr/bin/env npx tsx
/**
 * Test script to validate Supabase connection
 * Run with: npx tsx scripts/test-db.ts
 * 
 * Make sure to set environment variables:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - NEXT_PUBLIC_SUPABASE_ANON_KEY
 */

import { createClient } from '@supabase/supabase-js'

async function main() {
  console.log('🔌 Testing Supabase connection...\n')

  // Check env vars
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    console.error('❌ Missing environment variables!')
    console.error('   Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY')
    console.error('\n   You can set them inline:')
    console.error('   NEXT_PUBLIC_SUPABASE_URL=xxx NEXT_PUBLIC_SUPABASE_ANON_KEY=yyy npx tsx scripts/test-db.ts')
    process.exit(1)
  }

  console.log('✅ Environment variables found')
  console.log(`   URL: ${url.substring(0, 30)}...`)
  console.log(`   Key: ${key.substring(0, 20)}...`)

  // Create client
  const supabase = createClient(url, key)

  // Test 1: List projects
  console.log('\n📋 Fetching projects...')
  const { data: proyectos, error: proyectosError } = await supabase
    .from('proyectos')
    .select('*')
    .limit(10)

  if (proyectosError) {
    console.error('❌ Error fetching projects:', proyectosError.message)
    console.error('   Details:', proyectosError)
  } else {
    console.log(`✅ Found ${proyectos?.length ?? 0} project(s)`)
    if (proyectos && proyectos.length > 0) {
      console.log('\n   Sample projects:')
      proyectos.slice(0, 3).forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.nombre} - ${p.moneda} ${p.monto_total_activo}`)
      })
    }
  }

  // Test 2: List stages
  console.log('\n📋 Fetching stages...')
  const { data: etapas, error: etapasError } = await supabase
    .from('etapas')
    .select('*')
    .limit(10)

  if (etapasError) {
    console.error('❌ Error fetching stages:', etapasError.message)
  } else {
    console.log(`✅ Found ${etapas?.length ?? 0} stage(s)`)
  }

  // Test 3: List budget versions
  console.log('\n📋 Fetching budget versions...')
  const { data: versiones, error: versionesError } = await supabase
    .from('presupuesto_versiones')
    .select('*')
    .limit(10)

  if (versionesError) {
    console.error('❌ Error fetching budget versions:', versionesError.message)
  } else {
    console.log(`✅ Found ${versiones?.length ?? 0} budget version(s)`)
  }

  console.log('\n✨ Connection test complete!')
}

main().catch(console.error)

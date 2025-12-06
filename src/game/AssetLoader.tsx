import { useEffect } from 'react'
import { useStore } from './store'
import { useTexture, useGLTF } from '@react-three/drei'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import * as THREE from 'three'

// Preload all assets
export const AssetLoader = () => {
  const setLoading = useStore(state => state.setLoading)
  const setLoadingProgress = useStore(state => state.setLoadingProgress)

  useEffect(() => {
    let loaded = 0
    const totalAssets = 7 // grass texture, tree model, zombie model, 4 FBX files
    const loader = new FBXLoader()

    const updateProgress = (assetName?: string) => {
      loaded++
      const progress = Math.min(100, (loaded / totalAssets) * 100)
      setLoadingProgress(progress)
      if (assetName) {
        console.log(`Loaded: ${assetName} (${progress.toFixed(0)}%)`)
      }
      
      if (loaded >= totalAssets) {
        setTimeout(() => {
          setLoading(false)
          console.log('All assets loaded!')
        }, 300) // Small delay for smooth transition
      }
    }

    // Preload textures and models
    const preloadAssets = async () => {
      try {
        // Load texture
        const textureLoader = new THREE.TextureLoader()
        textureLoader.load(
          '/grass_texture.jpeg', 
          () => updateProgress('grass texture'),
          undefined,
          () => updateProgress('grass texture (error)')
        )

        // Load GLB models
        const gltfLoader = new GLTFLoader()
        gltfLoader.load(
          '/tree_pine.glb', 
          () => updateProgress('tree model'),
          undefined,
          () => updateProgress('tree model (error)')
        )
        gltfLoader.load(
          '/zombie.glb', 
          () => updateProgress('zombie model'),
          undefined,
          () => updateProgress('zombie model (error)')
        )

        // Load FBX files (zombie animations) - these are large, so they may take time
        loader.load('/zombie_idle.fbx', () => updateProgress('zombie_idle'), undefined, () => updateProgress('zombie_idle (error)'))
        loader.load('/zombie_attack.fbx', () => updateProgress('zombie_attack'), undefined, () => updateProgress('zombie_attack (error)'))
        loader.load('/zombie_die.fbx', () => updateProgress('zombie_die'), undefined, () => updateProgress('zombie_die (error)'))
        loader.load('/zombie_walk.fbx', () => updateProgress('zombie_walk'), undefined, () => updateProgress('zombie_walk (error)'))

        // HDR is loaded by Environment component separately, so we don't count it here
        // It will load in parallel and shouldn't block the game
      } catch (error) {
        console.error('Error preloading assets:', error)
        // Continue anyway after a delay
        setTimeout(() => {
          setLoading(false)
        }, 2000)
      }
    }

    preloadAssets()
  }, [setLoading, setLoadingProgress])

  return null
}

// Hook to preload texture
export const PreloadTexture = () => {
  useTexture('/grass_texture.jpeg')
  return null
}

// Hook to preload GLB
export const PreloadGLB = () => {
  useGLTF('/tree_pine.glb')
  useGLTF('/zombie.glb')
  return null
}


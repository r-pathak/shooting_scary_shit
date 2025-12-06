import { useEffect } from 'react'
import { useStore } from './store'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'

// Preload textures only - ZombieModelLoader handles FBX files
export const AssetLoader = () => {
  const setLoading = useStore(state => state.setLoading)
  const setLoadingProgress = useStore(state => state.setLoadingProgress)

  useEffect(() => {
    let loaded = 0
    const totalAssets = 2 // Just textures - FBX loaded by ZombieModelLoader
    const textureLoader = new THREE.TextureLoader()

    const updateProgress = (assetName: string) => {
      loaded++
      const progress = Math.min(100, (loaded / totalAssets) * 100)
      setLoadingProgress(progress)
      console.log(`Loaded: ${assetName} (${progress.toFixed(0)}%)`)
      
      if (loaded >= totalAssets) {
        setTimeout(() => {
          setLoading(false)
          console.log('Textures loaded! Waiting for zombie models...')
        }, 100)
      }
    }

    // Load textures
    textureLoader.load('/grass_texture.jpeg', () => updateProgress('grass texture'))
    textureLoader.load('/dirt_texture.jpg', () => updateProgress('dirt texture'))
  }, [setLoading, setLoadingProgress])

  return null
}

// Hook to preload textures
export const PreloadTexture = () => {
  useTexture('/grass_texture.jpeg')
  useTexture('/dirt_texture.jpg')
  return null
}

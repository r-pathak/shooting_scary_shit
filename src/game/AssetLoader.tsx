import { useEffect } from 'react'
import { useStore } from './store'
import { useTexture } from '@react-three/drei'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import * as THREE from 'three'

// Helper function to load with timeout
const loadWithTimeout = <T,>(
  loader: any,
  url: string,
  onProgress?: (progress: ProgressEvent) => void,
  timeout: number = 30000
): Promise<T> => {
  return new Promise((resolve, reject) => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    let completed = false

    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
    }

    const onSuccess = (result: T) => {
      if (!completed) {
        completed = true
        cleanup()
        resolve(result)
      }
    }

    const onError = (error: ErrorEvent | Error) => {
      if (!completed) {
        completed = true
        cleanup()
        reject(error instanceof Error ? error : new Error(error.message || 'Unknown error'))
      }
    }

    timeoutId = setTimeout(() => {
      if (!completed) {
        completed = true
        cleanup()
        reject(new Error(`Timeout loading ${url} after ${timeout}ms`))
      }
    }, timeout)

    loader.load(
      url,
      onSuccess,
      onProgress,
      onError
    )
  })
}

// Preload all assets
export const AssetLoader = () => {
  const setLoading = useStore(state => state.setLoading)
  const setLoadingProgress = useStore(state => state.setLoadingProgress)

  useEffect(() => {
    let loaded = 0
    const totalAssets = 6 // grass texture, dirt texture, 4 FBX files
    const fbxLoader = new FBXLoader()
    const textureLoader = new THREE.TextureLoader()

    const updateProgress = (assetName?: string, isError: boolean = false) => {
      loaded++
      const progress = Math.min(100, (loaded / totalAssets) * 100)
      setLoadingProgress(progress)
      if (assetName) {
        const status = isError ? ' (error)' : ''
        console.log(`Loaded: ${assetName}${status} (${progress.toFixed(0)}%)`)
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
      const loadPromises: Promise<any>[] = []

      // Load textures
      loadPromises.push(
        loadWithTimeout(textureLoader, '/grass_texture.jpeg')
          .then(() => updateProgress('grass texture'))
          .catch(() => updateProgress('grass texture', true))
      )

      loadPromises.push(
        loadWithTimeout(textureLoader, '/dirt_texture.jpg')
          .then(() => updateProgress('dirt texture'))
          .catch(() => updateProgress('dirt texture', true))
      )

      // Load FBX files (zombie animations) - these are large, so they may take time
      loadPromises.push(
        loadWithTimeout(fbxLoader, '/zombie_idle.fbx', undefined, 60000)
          .then(() => updateProgress('zombie_idle'))
          .catch((err) => {
            console.error('Failed to load zombie_idle.fbx:', err)
            updateProgress('zombie_idle', true)
          })
      )

      loadPromises.push(
        loadWithTimeout(fbxLoader, '/zombie_attack.fbx', undefined, 60000)
          .then(() => updateProgress('zombie_attack'))
          .catch((err) => {
            console.error('Failed to load zombie_attack.fbx:', err)
            updateProgress('zombie_attack', true)
          })
      )

      loadPromises.push(
        loadWithTimeout(fbxLoader, '/zombie_die.fbx', undefined, 60000)
          .then(() => updateProgress('zombie_die'))
          .catch((err) => {
            console.error('Failed to load zombie_die.fbx:', err)
            updateProgress('zombie_die', true)
          })
      )

      loadPromises.push(
        loadWithTimeout(fbxLoader, '/zombie_walk.fbx', undefined, 60000)
          .then(() => updateProgress('zombie_walk'))
          .catch((err) => {
            console.error('Failed to load zombie_walk.fbx:', err)
            updateProgress('zombie_walk', true)
          })
      )

      // Wait for all loads to complete (success or failure)
      try {
        await Promise.allSettled(loadPromises)
      } catch (error) {
        console.error('Error preloading assets:', error)
      }
    }

    preloadAssets()
  }, [setLoading, setLoadingProgress])

  return null
}

// Hook to preload textures
export const PreloadTexture = () => {
  useTexture('/grass_texture.jpeg')
  useTexture('/dirt_texture.jpg')
  return null
}


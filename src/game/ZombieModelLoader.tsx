import { useEffect, useState, createContext, useContext } from 'react'
import * as THREE from 'three'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { useStore } from './store'

interface ZombieModelData {
  model: THREE.Group | null
  animations: THREE.AnimationClip[]
  isLoading: boolean
}

const ZombieModelContext = createContext<ZombieModelData>({
  model: null,
  animations: [],
  isLoading: true
})

// Helper to load FBX - no timeout, just wait
const loadFBX = (loader: FBXLoader, url: string): Promise<THREE.Group> => {
  return new Promise((resolve, reject) => {
    console.log(`Loading ${url}...`)
    loader.load(
      url,
      (fbx) => {
        console.log(`Loaded ${url}`)
        resolve(fbx)
      },
      (progress) => {
        if (progress.total > 0) {
          const pct = Math.round((progress.loaded / progress.total) * 100)
          console.log(`${url}: ${pct}%`)
        }
      },
      (error) => {
        console.error(`Failed to load ${url}:`, error)
        reject(error)
      }
    )
  })
}

// Preload zombie model and all animations once
export const ZombieModelProvider = ({ children }: { children: React.ReactNode }) => {
  const [model, setModel] = useState<THREE.Group | null>(null)
  const [animations, setAnimations] = useState<THREE.AnimationClip[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const setZombiesReady = useStore(state => state.setZombiesReady)

  useEffect(() => {
    const loader = new FBXLoader()
    const clips: THREE.AnimationClip[] = []
    
    const loadAllModels = async () => {
      try {
        // Load idle (this has the main model mesh)
        const idleFbx = await loadFBX(loader, '/zombie_idle.fbx')
        idleFbx.scale.setScalar(0.01)
        
        // Debug: log the structure of the loaded FBX
        console.log('FBX structure:')
        idleFbx.traverse((child) => {
          console.log(`  - ${child.type}: ${child.name}`, child)
          if ((child as any).material) {
            console.log(`    HAS MATERIAL:`, (child as any).material)
          }
          if ((child as any).isMesh) {
            console.log(`    isMesh = true`)
          }
          if ((child as any).isSkinnedMesh) {
            console.log(`    isSkinnedMesh = true`)
          }
        })
        
        // Fix materials to prevent transparency issues (Mixamo FBX default settings cause see-through models)
        let materialCount = 0
        idleFbx.traverse((child: any) => {
          // Check for SkinnedMesh as well as Mesh
          if ((child.isMesh || child.isSkinnedMesh) && child.material) {
            const materials = Array.isArray(child.material) ? child.material : [child.material]
            materials.forEach((mat: THREE.Material) => {
              materialCount++
              console.log(`Fixing material ${materialCount}: type=${mat.type}, transparent=${mat.transparent}`)
              
              // Force fix on ANY material type
              mat.transparent = false
              mat.depthWrite = true
              mat.depthTest = true
              mat.side = THREE.FrontSide
              mat.needsUpdate = true
              
              // Additional properties for materials that have them
              if ('opacity' in mat) (mat as any).opacity = 1
              if ('alphaTest' in mat) (mat as any).alphaTest = 0
            })
          }
        })
        console.log(`Fixed ${materialCount} materials on zombie model`)
        
        setModel(idleFbx)
        
        if (idleFbx.animations.length > 0) {
          const clip = idleFbx.animations[0].clone()
          clip.name = 'idle'
          clips.push(clip)
        }

        // Load attack animation
        try {
          const attackFbx = await loadFBX(loader, '/zombie_attack.fbx')
          if (attackFbx.animations.length > 0) {
            const clip = attackFbx.animations[0].clone()
            clip.name = 'attack'
            clips.push(clip)
          }
        } catch (e) {
          console.warn('Attack animation not available')
        }

        // Load die animations (two variants for randomization)
        try {
          const dieFbx = await loadFBX(loader, '/zombie_die.fbx')
          if (dieFbx.animations.length > 0) {
            const clip = dieFbx.animations[0].clone()
            clip.name = 'die'
            clips.push(clip)
          }
        } catch (e) {
          console.warn('Die animation 1 not available')
        }

        try {
          const die2Fbx = await loadFBX(loader, '/zombie_die_2.fbx')
          if (die2Fbx.animations.length > 0) {
            const clip = die2Fbx.animations[0].clone()
            clip.name = 'die2'
            clips.push(clip)
          }
        } catch (e) {
          console.warn('Die animation 2 not available')
        }

        // Load walk animation
        try {
          const walkFbx = await loadFBX(loader, '/zombie_walk.fbx')
          if (walkFbx.animations.length > 0) {
            const clip = walkFbx.animations[0].clone()
            clip.name = 'walk'
            clips.push(clip)
          }
        } catch (e) {
          // Fallback - use idle as walk
          console.warn('Walk animation not available, using idle')
          const walkClip = clips.find(c => c.name === 'idle')?.clone()
          if (walkClip) {
            walkClip.name = 'walk'
            clips.push(walkClip)
          }
        }

        setAnimations([...clips])
        setIsLoading(false)
        setZombiesReady(true)
        console.log('All zombie models loaded!')
        
      } catch (error) {
        console.error('Failed to load zombie models:', error)
        // Still mark as ready so game can start (will show nothing for zombies)
        setIsLoading(false)
        setZombiesReady(true)
      }
    }

    loadAllModels()
  }, [setZombiesReady])

  return (
    <ZombieModelContext.Provider value={{ model, animations, isLoading }}>
      {children}
    </ZombieModelContext.Provider>
  )
}

export const useZombieModel = () => useContext(ZombieModelContext)

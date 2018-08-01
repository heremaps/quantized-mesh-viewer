import { DECODING_STEPS } from '@here/quantized-mesh-decoder'
import dat from 'dat.gui'
import * as THREE from 'three'

import createQuantizedMesh from './create-quantized-mesh.js'

function createRenderer () {
  const renderer = new THREE.WebGLRenderer()

  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.setSize(window.innerWidth, window.innerHeight)

  return renderer
}

function createCamera () {
  const camera = new THREE.PerspectiveCamera(
    44,
    window.innerWidth / window.innerHeight,
    0.1,
    100000
  )

  camera.position.z = 500
  camera.position.x = 0
  camera.position.y = 0

  return camera
}

function createLight (scene) {
  if (!params.light) {
    return
  }

  const light = new THREE.DirectionalLight(0xffffff, 1)

  light.castShadow = true
  light.shadow.mapSize.width = 1024
  light.shadow.mapSize.height = 1024
  light.shadow.camera.near = 0.1
  light.shadow.camera.far = 300
  light.shadow.camera.top = 200
  light.shadow.camera.left = 200
  light.shadow.camera.bottom = -200
  light.shadow.camera.right = -200
  light.position.set(-100.5, -20, 300)

  scene.add(light)

  if (params.lightHelper) {
    const helper = new THREE.CameraHelper(light.shadow.camera)

    scene.add(helper)
  }
}

function createControls (camera, renderer) {
  let controls = new THREE.OrbitControls(camera, renderer.domElement)

  controls.enableDamping = true
  controls.dampingFactor = 0.25
  controls.screenSpacePanning = true
  controls.minDistance = 1
  controls.maxDistance = 1000
  controls.maxPolarAngle = Math.PI
  controls.enableKeys = false

  return controls
}

function createContainer (scene, params) {
  const container = new THREE.Box3(
    new THREE.Vector3(-150, -150, 0),
    new THREE.Vector3(150, 150, 150)
  )

  const containerHelper = new THREE.Box3Helper(container, 0x6B6F73)
  scene.add(containerHelper)

  return container
}

function clearScene (scene) {
  scene.remove.apply(scene, scene.children)
}

function composeScene (scene, params) {
  const container = createContainer(scene, params)

  createLight(scene, params)
  createQuantizedMesh(scene, container, params)
}

function saveParams (params) {
  const urlParams = new URLSearchParams()

  for (let key in params) {
    urlParams.append(key, params[key])
  }

  window.history.replaceState(params, '', `?${urlParams.toString()}`)
}

function readParams () {
  const savedParams = new URLSearchParams(window.location.search)
  let savedParamsDecoded = {}

  for (let [key, value] of savedParams) {
    let decodedValue = value

    if (value === 'true' || value === 'false') {
      decodedValue = JSON.parse(value)
    }

    savedParamsDecoded[key] = decodedValue
  }

  return savedParamsDecoded
}

function createUI (scene, params) {
  const ui = new dat.GUI()
  const onChange = () => {
    saveParams(params)
    clearScene(scene, params)
    composeScene(scene, params)
  }

  const meshUrl = ui.add(params, 'meshUrl')
  const appearance = ui.add(params, 'appearance', [
    'normal',
    'basic',
    'phong',
    'points'
  ])
  const normalHelper = ui.add(params, 'normalHelper')
  const light = ui.add(params, 'light')
  const lightHelper = ui.add(params, 'lightHelper')
  const wireframe = ui.add(params, 'wireframe')
  const edgeVertices = ui.add(params, 'edgeVertices')
  const decoderFolder = ui.addFolder('Decoder Options')
  const maxDecodingStep = decoderFolder.add(params, 'maxDecodingStep', Object.keys(DECODING_STEPS))

  decoderFolder.open()

  meshUrl.onFinishChange(onChange)
  appearance.onChange(onChange)
  normalHelper.onChange(onChange)
  light.onChange(onChange)
  lightHelper.onChange(onChange)
  wireframe.onChange(onChange)
  edgeVertices.onChange(onChange)
  maxDecodingStep.onChange(onChange)
}

function renderFrame (scene, camera, renderer, controls) {
  window.requestAnimationFrame(() => {
    renderFrame(scene, camera, renderer, controls)
  })

  controls.update()
  renderer.render(scene, camera)
}

const decodingSteps = Object.keys(DECODING_STEPS)
const defaultParams = {
  meshUrl: '/example-tiles/14/2618/10044.terrain',
  appearance: 'normal',
  normalHelper: false,
  light: false,
  lightHelper: false,
  wireframe: true,
  edgeVertices: false,
  maxDecodingStep: decodingSteps[decodingSteps.length - 1]
}
const savedParams = readParams()

const params = Object.assign({}, defaultParams, savedParams)
const scene = new THREE.Scene()
const renderer = createRenderer()
const camera = createCamera()
const controls = createControls(camera, renderer)

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight)
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
})

document.body.appendChild(renderer.domElement)

createUI(scene, params)
composeScene(scene, params)
renderFrame(scene, camera, renderer, controls)

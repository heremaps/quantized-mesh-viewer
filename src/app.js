import Cesium from 'cesium'
import SurfaceProvider from './surface-provider'

const container = document.getElementById('cesium-container')
const tilingScheme = new Cesium.WebMercatorTilingScheme()

const terrainProvider = new SurfaceProvider({
  getUrl: (x, y, level) => {
    const column = x
    const row = tilingScheme.getNumberOfYTilesAtLevel(level) - y - 1

    return `./example-tiles/${ level }/${ column }/${ row }.terrain`
  },
  credit: `
    <a href="https://viewer.nationalmap.gov/basic/?basemap=b1&category=ned,nedsrc">
      The National Map
    </a>
  `
})

const viewer = new Cesium.Viewer(container, {
  mapProjection: new Cesium.WebMercatorProjection(),
  sceneMode: Cesium.SceneMode.COLUMBUS_VIEW,
  terrainProvider
})

viewer.extend(Cesium.viewerCesiumInspectorMixin)

viewer.camera.setView({
  destination: Cesium.Cartesian3.fromDegrees(
    -122.47366673618687,
    37.73108915123822,
    1000
  ),
  orientation: {
    heading: 0.0,
    pitch: -Cesium.Math.PI_OVER_TWO,
    roll: 0.0
  }
})

console.log(viewer)

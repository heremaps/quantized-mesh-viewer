import Cesium from 'cesium'
import decode from '@here/quantized-mesh-decoder'

import dummyTileBuffer from './dummy-tile'

export default class SurfaceProvider {
  constructor (options = {}) {
    this.ready = false
    this.dummyTile = decode(dummyTileBuffer)
    this.tilingScheme = options.tilingScheme || new Cesium.WebMercatorTilingScheme()

    if (options.getUrl === undefined) {
      throw new Error('getUrl option is missing')
    }

    if (options.credit !== undefined) {
      this.credits = [new Cesium.Credit(options.credit)]
    }

    this.getUrl = options.getUrl

    this.readyPromise = Promise.resolve(true)
    this.ready = true
  }

  generateDummyTileHeader (x, y, level) {
    const tileRect = this.tilingScheme.tileXYToRectangle(x, y, level)
    const tileNativeRect = this.tilingScheme.tileXYToNativeRectangle(x, y, level)
    const tileCenter = Cesium.Cartographic.toCartesian(
      Cesium.Rectangle.center(tileRect)
    )
    const horizonOcclusionPoint = Cesium.Ellipsoid.WGS84.transformPositionToScaledSpace(
      tileCenter
    )

    return {
      centerX: tileCenter.x,
      centerY: tileCenter.y,
      centerZ: tileCenter.z,
      minHeight: 0,
      maxHeight: 0,
      boundingSphereCenterX: tileCenter.x,
      boundingSphereCenterY: tileCenter.y,
      boundingSphereCenterZ: tileCenter.z,
      boundingSphereRadius: tileNativeRect.height,
      horizonOcclusionPointX: horizonOcclusionPoint.x,
      horizonOcclusionPointY: horizonOcclusionPoint.y,
      horizonOcclusionPointZ: horizonOcclusionPoint.z
    }
  }

  createQuantizedMeshData (decodedTile, x, y, level) {
    const tileRect = this.tilingScheme.tileXYToRectangle(x, y, level)
    const boundingSphereCenter = new Cesium.Cartesian3(
      decodedTile.header.boundingSphereCenterX,
      decodedTile.header.boundingSphereCenterY,
      decodedTile.header.boundingSphereCenterZ
    )
    const boundingSphere = new Cesium.BoundingSphere(
      boundingSphereCenter,
      decodedTile.header.boundingSphereRadius
    )
    const horizonOcclusionPoint = new Cesium.Cartesian3(
      decodedTile.header.horizonOcclusionPointX,
      decodedTile.header.horizonOcclusionPointY,
      decodedTile.header.horizonOcclusionPointZ
    )

    let orientedBoundingBox

    if (tileRect.width < Cesium.Math.PI_OVER_TWO + Cesium.Math.EPSILON5) {
      orientedBoundingBox = Cesium.OrientedBoundingBox.fromRectangle(
        tileRect,
        decodedTile.header.minHeight,
        decodedTile.header.maxHeight
      )
    }

    return new Cesium.QuantizedMeshTerrainData({
      minimumHeight: decodedTile.header.minHeight,
      maximumHeight: decodedTile.header.maxHeight,
      quantizedVertices: decodedTile.vertexData,
      indices: decodedTile.triangleIndices,
      boundingSphere: boundingSphere,
      orientedBoundingBox: orientedBoundingBox,
      horizonOcclusionPoint: horizonOcclusionPoint,
      westIndices: decodedTile.westIndices,
      southIndices: decodedTile.southIndices,
      eastIndices: decodedTile.eastIndices,
      northIndices: decodedTile.northIndices,
      westSkirtHeight: 100,
      southSkirtHeight: 100,
      eastSkirtHeight: 100,
      northSkirtHeight: 100,
      childTileMask: 15,
      credits: this.credits
    })
  }

  generateDummyTile (x, y, level) {
    return Object.assign(
      {},
      this.dummyTile,
      this.generateDummyTileHeader(x, y, level)
    )
  }

  decodeResponse (res, x, y, level) {
    return res.arrayBuffer()
      .then(buffer => {
        return decode(buffer)
      }).catch((err) => {
        console.error(`Decoding failed on tile ${this.getUrl(x, y, level)}`)
        console.error(err)

        return this.generateDummyTile(x, y, level)
      })
  }

  requestTileGeometry (x, y, level) {
    const url = this.getUrl(x, y, level)

    return window.fetch(url)
      .then(res => {
        if (res.status !== 200) {
          return this.generateDummyTile(x, y, level)
        }

        return this.decodeResponse(res, x, y, level)
      })
      .then(decodedTile => {
        return this.createQuantizedMeshData(decodedTile, x, y, level)
      })
      .catch(err => {
        console.error(err)
      })
  }

  getTileDataAvailable (x, y, level) {
    return true
  }

  getLevelMaximumGeometricError (level) {
    const levelZeroMaximumGeometricError = Cesium.TerrainProvider
      .getEstimatedLevelZeroGeometricErrorForAHeightmap(
        this.tilingScheme.ellipsoid,
        65,
        this.tilingScheme.getNumberOfXTilesAtLevel(0)
      )

    return levelZeroMaximumGeometricError / (1 << level)
  }
}

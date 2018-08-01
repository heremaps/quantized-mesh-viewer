import decode, { DECODING_STEPS } from '@here/quantized-mesh-decoder'

const THREE = window.THREE

function loadMesh (path) {
  return window.fetch(path)
    .then(res => {
      if (res.status !== 200) {
        throw new Error('Could not load the mesh')
      }

      return res.arrayBuffer()
    })
}

function signNotZero (vector) {
  return new THREE.Vector2(
    vector.x >= 0 ? 1 : -1,
    vector.y >= 0 ? 1 : -1
  )
}

function decodeOct (encodedVector) {
  let decodedVector = encodedVector.divideScalar(255).multiplyScalar(2).subScalar(1)

  decodedVector = new THREE.Vector3(
    decodedVector.x,
    decodedVector.y,
    1 - Math.abs(decodedVector.x) - Math.abs(decodedVector.y)
  )

  if (decodedVector.z < 0) {
    const xy = new THREE.Vector2(decodedVector.x, decodedVector.y)
    const xyAbs = xy.distanceTo(new THREE.Vector2(0, 0))
    const xySign = signNotZero(xy)
    const decodedXy = xySign.multiplyScalar(1 - xyAbs)

    decodedVector.set(decodedXy.x, decodedXy.y, decodedVector.z)
  }

  return decodedVector.normalize()
}

function constructHighlightedVerticesGeometry (vertexData, indices, container) {
  const elementsPerVertex = 3
  const geometry = new THREE.BufferGeometry()
  const vertexCount = vertexData.length / elementsPerVertex
  const uArrayPosition = 0
  const vArrayPosition = uArrayPosition + vertexCount
  const heightArrayPosition = uArrayPosition + vertexCount * 2

  const vertexMaxPosition = 32767
  const containerSize = new THREE.Vector3()

  container.getSize(containerSize)

  const xScale = containerSize.x / vertexMaxPosition
  const yScale = containerSize.y / vertexMaxPosition
  const zScale = containerSize.z / vertexMaxPosition

  const positionAttributeArray = new Float32Array(indices.length * elementsPerVertex)

  for (let i = 0; i < indices.length; i++) {
    const vertexIndex = indices[i]
    const u = vertexData[uArrayPosition + vertexIndex]
    const v = vertexData[vArrayPosition + vertexIndex]
    const height = vertexData[heightArrayPosition + vertexIndex]

    positionAttributeArray[i * elementsPerVertex] = u * xScale - containerSize.x / 2
    positionAttributeArray[i * elementsPerVertex + 1] = v * yScale - containerSize.y / 2
    positionAttributeArray[i * elementsPerVertex + 2] = height * zScale
  }

  const positionAttribute = new THREE.BufferAttribute(
    positionAttributeArray,
    elementsPerVertex
  )

  geometry.addAttribute('position', positionAttribute)

  return geometry
}

function constructPositionAttribute (vertexData, container) {
  const elementsPerVertex = 3
  const vertexCount = vertexData.length / elementsPerVertex
  const positionAttributeArray = new Float32Array(vertexData.length)

  const vertexMaxPosition = 32767
  const containerSize = new THREE.Vector3()

  container.getSize(containerSize)

  const xScale = containerSize.x / vertexMaxPosition
  const yScale = containerSize.y / vertexMaxPosition
  const zScale = containerSize.z / vertexMaxPosition

  for (let i = 0; i < vertexData.length; i++) {
    positionAttributeArray[i * elementsPerVertex] = vertexData[i] * xScale - containerSize.x / 2
    positionAttributeArray[i * elementsPerVertex + 1] = vertexData[i + vertexCount] * yScale - containerSize.y / 2
    positionAttributeArray[i * elementsPerVertex + 2] = vertexData[i + vertexCount * 2] * zScale
  }

  return new THREE.BufferAttribute(positionAttributeArray, elementsPerVertex)
}

function constructNormalAttribute (vertexNormalsBuffer, vertexData) {
  const view = new DataView(vertexNormalsBuffer)
  const elementsPerEncodedNormal = 2
  const elementsPerNormal = 3
  const vertexNormalsAttributeArray = new Float32Array(vertexData.length)

  for (let position = 0, i = 0; position < vertexNormalsBuffer.byteLength; position += Uint8Array.BYTES_PER_ELEMENT * elementsPerEncodedNormal, i++) {
    const decodedNormal = decodeOct(new THREE.Vector2(
      view.getUint8(position, true),
      view.getUint8(position + Uint8Array.BYTES_PER_ELEMENT, true)
    ))

    vertexNormalsAttributeArray[i * elementsPerNormal] = decodedNormal.x
    vertexNormalsAttributeArray[i * elementsPerNormal + 1] = decodedNormal.y
    vertexNormalsAttributeArray[i * elementsPerNormal + 2] = decodedNormal.z
  }

  return new THREE.BufferAttribute(vertexNormalsAttributeArray, elementsPerNormal, true)
}

/**
 * Drops Z-coordinate of each vertex and scales
 * X and Y to the [0, 1] range
 * @param verticesArray
 * @param container
 * @returns {THREE.BufferAttribute}
 */
function constructUvAttribute (verticesArray, container) {
  const containerSize = new THREE.Vector2()
  const elementsPerVertex = 3
  const elementsPerUv = 2
  const uvArray = new Float32Array(
    verticesArray.length / elementsPerVertex * elementsPerUv
  )

  container.getSize(containerSize)

  for (let i = 0, uvIndex = 0; i < verticesArray.length; i++) {
    switch (i % 3) {
      case 0: {
        uvArray[uvIndex] = (verticesArray[i] + containerSize.x / 2) / containerSize.x
        uvIndex++

        break
      }
      case 1: {
        uvArray[uvIndex] = (verticesArray[i] + containerSize.y / 2) / containerSize.y
        uvIndex++
      }
    }
  }

  return new THREE.BufferAttribute(uvArray, elementsPerUv)
}

function constructGeometry ({header, vertexData, triangleIndices, extensions}, container) {
  const planeGeometry = new THREE.BufferGeometry()
  const positionAttribute = constructPositionAttribute(vertexData, container)
  const uvAttribute = constructUvAttribute(positionAttribute.array, container)

  planeGeometry.addAttribute('position', positionAttribute)
  planeGeometry.addAttribute('uv', uvAttribute)

  if (triangleIndices !== undefined) {
    const indexAttribute = new THREE.BufferAttribute(triangleIndices, 1)

    planeGeometry.setIndex(indexAttribute)
  }

  if (extensions !== undefined && extensions.vertexNormals !== undefined) {
    const normalAttribute = constructNormalAttribute(extensions.vertexNormals, vertexData)

    planeGeometry.addAttribute('normal', normalAttribute)
  } else {
    planeGeometry.computeVertexNormals()
  }

  return planeGeometry
}

function getMeshMaterial (params) {
  let MaterialConstructor
  const materialParameters = {
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
    flatShading: true
  }

  switch (params.appearance) {
    case 'normal': {
      MaterialConstructor = THREE.MeshNormalMaterial
      break
    }
    case 'basic': {
      MaterialConstructor = THREE.MeshBasicMaterial
      materialParameters.color = 0x0000FF
      break
    }
    case 'phong': {
      MaterialConstructor = THREE.MeshPhongMaterial
      materialParameters.color = 0x0000FF
      break
    }
    case 'points': {
      MaterialConstructor = THREE.PointsMaterial
      materialParameters.color = 0x0000FF
      materialParameters.size = 7
    }
  }

  return new MaterialConstructor(materialParameters)
}

function getObject (geometry, material, params) {
  switch (params.appearance) {
    case 'points': {
      return new THREE.Points(geometry, material)
    }
    default: {
      return new THREE.Mesh(geometry, material)
    }
  }
}

function highlightEdgeVertices (decodedMesh, container, scene) {
  const size = 10

  if (decodedMesh.westIndices !== undefined) {
    const westVerticesGeometry = constructHighlightedVerticesGeometry(
      decodedMesh.vertexData,
      decodedMesh.westIndices,
      container
    )
    const westVerticesMaterial = new THREE.PointsMaterial({
      color: 0xFFDC00,
      size
    })
    const westVertices = new THREE.Points(westVerticesGeometry, westVerticesMaterial)

    scene.add(westVertices)
  }

  if (decodedMesh.northIndices !== undefined) {
    const northVerticesGeometry = constructHighlightedVerticesGeometry(
      decodedMesh.vertexData,
      decodedMesh.northIndices,
      container
    )
    const northVerticesMaterial = new THREE.PointsMaterial({
      color: 0x0092FF,
      size
    })
    const northVertices = new THREE.Points(northVerticesGeometry, northVerticesMaterial)

    scene.add(northVertices)
  }

  if (decodedMesh.eastIndices !== undefined) {
    const eastVerticesGeometry = constructHighlightedVerticesGeometry(
      decodedMesh.vertexData,
      decodedMesh.eastIndices,
      container
    )
    const eastVerticesMaterial = new THREE.PointsMaterial({
      color: 0xFF00DD,
      size
    })
    const eastVertices = new THREE.Points(eastVerticesGeometry, eastVerticesMaterial)

    scene.add(eastVertices)
  }

  if (decodedMesh.southIndices !== undefined) {
    const southVerticesGeometry = constructHighlightedVerticesGeometry(
      decodedMesh.vertexData,
      decodedMesh.southIndices,
      container
    )
    const southVerticesMaterial = new THREE.PointsMaterial({
      color: 0x2DE521,
      size
    })
    const southVertices = new THREE.Points(southVerticesGeometry, southVerticesMaterial)

    scene.add(southVertices)
  }
}

function addWireframe (mesh) {
  const wireframe = new THREE.LineSegments(
    new THREE.WireframeGeometry(mesh.geometry),
    new THREE.LineBasicMaterial({
      color: 0xffffff,
      linewidth: 2
    })
  )

  mesh.add(wireframe)
}

function addNormalHelper (scene, mesh) {
  const hasNormals = mesh.geometry.getAttribute('normal') !== undefined

  if (!hasNormals) {
    console.warn('Normals helper was requested but geometry does not contain normals')
  } else {
    const normalsHelper = new THREE.VertexNormalsHelper(mesh, 30, 0x00ff00, 1)

    scene.add(normalsHelper)
  }
}

export default function createQuantizedMesh (scene, container, params) {
  const containerSize = new THREE.Vector3()

  container.getSize(containerSize)

  return loadMesh(params.meshUrl)
    .then(buffer => decode(buffer, {
      maxDecodingStep: DECODING_STEPS[params.maxDecodingStep]
    }))
    .then(decodedMesh => {
      console.log(decodedMesh)

      if (decodedMesh.vertexData === undefined) {
        return
      }

      const geometry = constructGeometry(decodedMesh, container)
      const material = getMeshMaterial(params)
      const object = getObject(geometry, material, params)

      scene.add(object)

      if (params.edgeVertices) {
        highlightEdgeVertices(decodedMesh, container, scene)
      }

      if (params.wireframe) {
        addWireframe(object)
      }

      if (params.normalHelper) {
        addNormalHelper(scene, object)
      }
    })
    .catch(err => {
      console.log(err)
    })
}

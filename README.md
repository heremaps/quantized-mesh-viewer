Cesium Terrain Debugger
===========================

Application to render and debug custom quantized mesh tiles using Cesium.



### Run

1. Build Docker image and run the container.
```
docker build -t cesium-terrain-dubugger .
docker run -t -i --rm --name cesium-terrain-debugger -p 8081:8080 -v $(pwd):/usr/src/app cesium-terrain-dubugger
```
1. Open `http://localhost:8081` in the browser.



### Custom Tiles

By default application renders example tiles from `./example-tiles` folder. To serve files from different location customize `SurfaceProvider` parameters in the `./src/app.js`.

Application serves statics from its whole root directory so you can put folder with custom tiles next to the `./example-tiles` folder.



### Configuring `SurfaceProvider`

```
new SurfaceProvider(options)
```

Options:
* getUrl: (x: Number, y: Number, level: Number) → String  
  Required  
  Constructs URL to fetch a tile using provided grid coordinates.
* tilingScheme: Cesium.TilingScheme  
  Optional  
  Default — Cesium.WebMercatorTilingScheme
* credit: [Cesium.Credit]  
  Optional  
  Credits for a tiles data



### Notes

- Cesium cannot render tiles for a specific zoom level unless you provide tiles for all parent level. The `SurfaceProvider` mocks missing tiles with a plane geometry.



### Links

* [Quantized Mesh Decoder](https://deveo.in.here.com/HERE/projects/surface/repositories/quantized-mesh-decoder/tree/master)
* [Quantized Mesh Format Specification](https://github.com/AnalyticalGraphicsInc/quantized-mesh)




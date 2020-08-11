import React, { useEffect, useState } from 'react';
import {
  View2D,
  vtkInteractorStyleMPRWindowLevel,
  invertVolume,
} from '@vtk-viewport';
import vtkHttpDataSetReader from 'vtk.js/Sources/IO/Core/HttpDataSetReader';
import vtkVolume from 'vtk.js/Sources/Rendering/Core/Volume';
import vtkVolumeMapper from 'vtk.js/Sources/Rendering/Core/VolumeMapper';

// The data here is read from an unscaled *.vti, so we translate our windowCenter.

const VTKBasicExampleHook = () => {
  const PRESETS = {
    BONE: {
      windowWidth: 100,
      windowCenter: 500 + 1024,
    },
    HEAD: {
      windowWidth: 1000,
      windowCenter: 300 + 1024,
    },
  };
  const [volumes, setVolumes] = useState([]);
  const [levels, setLevels] = useState({});
  const [apis, setApis] = useState([]);

  useEffect(() => {
    const reader = vtkHttpDataSetReader.newInstance({
      fetchGzip: true,
    });
    const volumeActor = vtkVolume.newInstance();
    const volumeMapper = vtkVolumeMapper.newInstance();

    volumeActor.setMapper(volumeMapper);

    reader.setUrl('/headsq.vti', { loadData: true }).then(() => {
      const data = reader.getOutputData();
      volumeMapper.setInputData(data);
      setVolumes([volumeActor]);
    });
  }, []);

  const setWLPreset = e => {
    const preset = e.target.value;
    const voi = PRESETS[preset];

    const volume = volumes.length ? volumes[0] : '';
    const rgbTransferFunction = volume.getProperty().getRGBTransferFunction(0);

    const low = voi.windowCenter - voi.windowWidth / 2;
    const high = voi.windowCenter + voi.windowWidth / 2;

    rgbTransferFunction.setMappingRange(low, high);

    setLevels({ windowWidth: voi.windowWidth, windowCenter: voi.windowCenter });
    updateAllViewports();
  };

  const invert = () => {
    const volume = volumes.length ? volumes[0] : '';

    invertVolume(volume, updateAllViewports);
  };

  const updateAllViewports = () => {
    Object.keys(apis).forEach(viewportIndex => {
      const api = apis[viewportIndex];
      api.genericRenderWindow.getRenderWindow().render();
    });
  };

  const saveRenderWindow = viewportIndex => {
    return api => {
      apis[viewportIndex] = api;

      if (viewportIndex === 1) {
        const istyle = vtkInteractorStyleMPRWindowLevel.newInstance();

        const callbacks = {
          setOnLevelsChanged: voi => {
            const { windowWidth, windowCenter } = voi;
            const localLevels = Object.assign(levels, {});
            apis.forEach(apiItem => {
              const renderWindow = apiItem.genericRenderWindow.getRenderWindow();

              apiItem.updateVOI(windowWidth, windowCenter);
              renderWindow.render();
            });
            localLevels.windowCenter = windowCenter;
            localLevels.windowWidth = windowWidth;
            setLevels(localLevels);
          },
        };
        api.setInteractorStyle({ istyle, callbacks });
      }
    };
  };

  return (
    <>
      {!(volumes && volumes.length) && <h4>Loading...</h4>}
      {volumes && volumes.length > 0 && (
        <div className="row">
          <div className="col-xs-12">
            <p>
              This example demonstrates how to use the <code>onCreated</code>{' '}
              prop to obtain access to the VTK render window for one or more
              component. It also shows how to provide an array of vtkVolumes to
              the component for rendering. When we change the RGB Transfer
              Function for the volume using the Window/Level and Invert buttons,
              we can see that this is applied inside both components.
            </p>
          </div>
          <div className="col-xs-12">
            <h5>Set a Window/Level Preset</h5>
            <div className="btn-group">
              <button
                className="btn btn-primary"
                value="BONE"
                onClick={setWLPreset}
              >
                Bone
              </button>
              <button
                className="btn btn-primary"
                value="HEAD"
                onClick={setWLPreset}
              >
                Head
              </button>
              <button className="btn btn-primary" onClick={invert}>
                Invert
              </button>
            </div>
            <span>WW: {levels.windowWidth}</span>
            <span>WC: {levels.windowCenter}</span>
          </div>
          <div className="col-xs-12 col-sm-6">
            <View2D volumes={volumes} onCreated={saveRenderWindow(0)} />
          </div>
          <div className="col-xs-12 col-sm-6">
            <View2D volumes={volumes} onCreated={saveRenderWindow(1)} />
          </div>
        </div>
      )}
    </>
  );
};

export default VTKBasicExampleHook;

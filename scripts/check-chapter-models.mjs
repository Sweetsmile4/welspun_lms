import assert from 'node:assert/strict';
import test from 'node:test';
import { DEMO_COURSES } from '../frontend/src/lib/client-demo/course-data.ts';
import {
  createStationGeometry,
  getStationModel,
} from '../frontend/src/components/client-demo/station-models.ts';

const options = {
  angle: 24,
  inspectionView: 'cross_section',
  selectedDefect: 'undercut',
};

for (const course of DEMO_COURSES) {
  for (const chapter of course.scenes) {
    test(`${course.id}: ${chapter.title} has its own valid model`, () => {
      const model = getStationModel(chapter.diagramType, options);
      assert.equal(model.type, chapter.diagramType);
      assert.ok(model.parts.length >= 3);
      assert.equal(
        new Set(model.parts.map((part) => part.id)).size,
        model.parts.length,
      );
      for (const part of model.parts) {
        assert.ok(part.detail.length > 30);
        assert.ok(part.position.every(Number.isFinite));
        for (const mesh of part.meshes) {
          const geometry = createStationGeometry(mesh);
          const vertices = geometry.getAttribute('position');
          assert.ok(vertices.count > 0);
          for (let i = 0; i < vertices.count; i++) {
            assert.ok(
              [vertices.getX(i), vertices.getY(i), vertices.getZ(i)].every(
                Number.isFinite,
              ),
            );
          }
          geometry.dispose();
        }
      }
    });
  }
}

test('receiving stamp is on the coil surface and shows the chapter mismatch', () => {
  const { parts } = getStationModel('coil_receiving', options);
  const coil = parts.find((part) => part.id === 'coil').meshes[0];
  const stamp = parts.find((part) => part.id === 'stamp').meshes[0];
  assert.equal(coil.shape, 'tube');
  assert.equal(stamp.text, 'HEAT 8419');
  assert.equal(
    parts.find((part) => part.id === 'documents').meshes[0].text,
    'MTR 8410',
  );
  assert.ok(Math.abs(stamp.position[0] - coil.position[0]) < coil.args[2] / 2);
  assert.ok(
    Math.abs(stamp.position[2] - coil.position[2] - coil.args[0]) < 0.1,
  );
});

test('preparation and forming use the roll counts described in their chapters', () => {
  assert.equal(
    getStationModel('strip_prep', options).parts.find(
      (part) => part.id === 'leveler',
    ).meshes.length,
    9,
  );
  assert.equal(
    getStationModel('helical_forming', options).parts.find(
      (part) => part.id === 'rolls',
    ).meshes.length,
    3,
  );
});

test('the forming angle changes both feed orientation and seam pitch', () => {
  const a = getStationModel('helical_forming', { ...options, angle: 12 });
  const b = getStationModel('helical_forming', { ...options, angle: 42 });
  assert.notDeepEqual(
    a.parts.find((part) => part.id === 'strip').meshes,
    b.parts.find((part) => part.id === 'strip').meshes,
  );
  assert.notDeepEqual(
    a.parts.find((part) => part.id === 'seam').meshes,
    b.parts.find((part) => part.id === 'seam').meshes,
  );
});

test('all six inspection gates and calibration checks are represented', () => {
  assert.deepEqual(
    getStationModel('inspection_gates', options).parts.map((part) => part.id),
    ['incoming', 'milling', 'welding', 'hydro', 'ut', 'release', 'calibration'],
  );
});

test('each defect has distinct geometry and internal defects are hidden in surface view', () => {
  const signatures = new Set();
  for (const defect of [
    'undercut',
    'porosity',
    'lack_of_fusion',
    'lack_of_penetration',
  ]) {
    const section = getStationModel('defect_types', {
      ...options,
      selectedDefect: defect,
    });
    const meshes = section.parts.find(
      (part) => part.id === 'indication',
    ).meshes;
    assert.ok(meshes.length);
    signatures.add(JSON.stringify(meshes));
    if (defect !== 'undercut') {
      const surface = getStationModel('defect_types', {
        ...options,
        selectedDefect: defect,
        inspectionView: 'surface',
      });
      assert.equal(
        surface.parts.find((part) => part.id === 'indication').meshes.length,
        0,
      );
    }
  }
  assert.equal(signatures.size, 4);
});

test('unknown chapter types fail instead of showing unrelated equipment', () => {
  assert.throws(
    () => getStationModel('unknown_chapter', options),
    /No chapter-specific model/,
  );
});

import * as Vec3 from './engine/Vec3.js';
import * as Mat4 from './engine/Mat4.js';
import * as Renderer from './engine/Renderer.js';

import * as Mesh from './engine/Mesh.js';
import * as GeometryBuilder from './engine/GeometryBuilder.js';

import * as Camera from './engine/Camera.js';
import * as Orbit from './camera/controls.js';

import * as ColladaParser from './parsers/ColladaParser.js';
import * as GLBParser from './parsers/GLBParser.js';

import * as landscape from './landscape/landscape.js';
import * as simplexNoise from './landscape/noise.js';

import * as Collision from './collision/collision.js';
import * as Shapes from './collision/shapes.js'

import * as BurtAudio from './audio/audio.js';
import * as Texture from './texture/texture.js';

import * as Splash from './engine/splash.js';

Splash.runSplash(1000);

export const BurtCore = {
  Vec3: Vec3.Vec3,
  WebGLRenderer: Renderer.WebGLRenderer,
  Mesh: Mesh.Mesh,
  Mat4: Mat4.Mat4,
  GeometryBuilder: new GeometryBuilder.GeometryBuilder(),
  MathUtils: GeometryBuilder.MathUtils,
  Camera: Camera.Camera,
  FreeCamera: Camera.FreeCamera,
  Orbit: Orbit,
  ColladaParser: ColladaParser.ColladaParser,
  GLBParser: GLBParser.GLBParser,
  Landscape: landscape,
  SimplexNoise: simplexNoise,
  Collision: Collision,
  CollisionShapes: Shapes,
  Audio: BurtAudio.BurtAudio,
  Texture: Texture
};

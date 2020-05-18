import * as THREE from "three";

const aimTowardAndGetDistance = (function() {
  const delta = new THREE.Vector3();

  return function aimTowardAndGetDistance(source, targetPos, maxTurn) {
    delta.subVectors(targetPos, source.position);
    // compute the direction we want to be facing
    const targetRot = Math.atan2(delta.x, delta.z) + Math.PI * 1.5;
    // rotate in the shortest direction
    const deltaRot =
      ((targetRot - source.rotation.y + Math.PI * 1.5) % (Math.PI * 2)) -
      Math.PI;
    // make sure we don't turn faster than maxTurn
    const deltaRotation = minMagnitude(deltaRot, maxTurn);
    // keep rotation between 0 and Math.PI * 2
    source.rotation.y = THREE.Math.euclideanModulo(
      source.rotation.y + deltaRotation,
      Math.PI * 2
    );
    // return the distance to the target
    return delta.length();
  };
})();

function rand(min, max) {
  if (max === undefined) {
    max = min;
    min = 0;
  }
  return Math.random() * (max - min) + min;
}

// Returns true of obj1 and obj2 are close
function isClose(obj1, obj1Radius, obj2, obj2Radius) {
  const minDist = obj1Radius + obj2Radius;
  const dist = obj1.position.distanceTo(obj2.position);
  return dist < minDist;
}

// keeps v between -min and +min
function minMagnitude(v, min) {
  return Math.abs(v) > min ? min * Math.sign(v) : v;
}

function removeArrayElement(array, element) {
  const ndx = array.indexOf(element);
  if (ndx >= 0) {
    array.splice(ndx, 1);
  }
}

export {
  aimTowardAndGetDistance,
  rand,
  isClose,
  minMagnitude,
  removeArrayElement
};

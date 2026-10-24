type Coordinates = {
  // TODO: make both properties readonly
  latitude: number;
  longitude: number;
};

type Route = {
  // TODO: make name readonly and stops a readonly property holding a readonly array
  name: string;
  stops: Coordinates[];
};

function moveNorth(point: Coordinates, degrees: number): Coordinates {
  // TODO: return a new point instead of mutating the input
  point.latitude += degrees;
  return point;
}

function addStop(route: Route, stop: Coordinates): Route {
  // TODO: return a new route instead of mutating the input
  route.stops.push(stop);
  return route;
}

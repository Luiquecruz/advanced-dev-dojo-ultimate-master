type Coordinates = {
  readonly latitude: number;
  readonly longitude: number;
};

type Route = {
  readonly name: string;
  readonly stops: readonly Coordinates[];
};

function moveNorth(point: Coordinates, degrees: number): Coordinates {
  return { ...point, latitude: point.latitude + degrees };
}

function addStop(route: Route, stop: Coordinates): Route {
  return { ...route, stops: [...route.stops, stop] };
}

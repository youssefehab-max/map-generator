export interface Floor {
  id: string;
  image: string;
}

export interface AdjacencyItem {
  node: string; // id of the neighbor node
  weight: number;
}

export interface MapNode {
  _id: string;
  name?: string;
  x: number;
  y: number;
  floorId: string;
  adjacencyList: AdjacencyItem[];
}

export interface Building {
  _id: string;
  name: string;
  mapCreator: string;
  floors: Floor[];
  nodes: MapNode[];
}

export interface PathPoint {
  nodeId: string;
  name?: string;
  x: number;
  y: number;
}

export interface FloorSegment {
  floorId: string;
  image: string | null;
  points: PathPoint[];
}

export interface PathData {
  reachable: boolean;
  distance: number | null;
  floors: FloorSegment[];
}

export interface AuthUser {
  id: string;
  username: string;
  email: string;
}

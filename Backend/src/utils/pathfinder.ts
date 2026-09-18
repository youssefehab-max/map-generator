/**
 * Dijkstra-based pathfinder for a Building's node graph.
 *
 * This is a TypeScript port of the original handleJSON.js logic, adapted to
 * match the real field names used by the Mongoose schema (_id, x, y, floorId,
 * adjacencyList) instead of the placeholder names the original script used
 * (id, X, Y, floorID, adjacency_list). The core Dijkstra + priority-queue
 * algorithm is unchanged.
 */

export interface AdjacencyItemLike {
  node: string;
  weight: number;
}

export interface NodeLike {
  _id: string;
  name?: string;
  x: number;
  y: number;
  floorId: string;
  adjacencyList: AdjacencyItemLike[];
}

export interface BuildingLike {
  nodes: NodeLike[];
}

export interface PathPoint {
  nodeId: string;
  name?: string;
  x: number;
  y: number;
}

export interface FloorSegment {
  floorId: string;
  points: PathPoint[];
}

export interface PathResult {
  distance: number | null;
  reachable: boolean;
  floors: FloorSegment[];
}

class PriorityQueue {
  private heap: { node: string; priority: number }[] = [];

  push(node: string, priority: number) {
    this.heap.push({ node, priority });
    this.bubbleUp(this.heap.length - 1);
  }

  pop() {
    if (this.heap.length === 0) return null;
    const min = this.heap[0];
    const end = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = end;
      this.sinkDown(0);
    }
    return min;
  }

  isEmpty() {
    return this.heap.length === 0;
  }

  private bubbleUp(index: number) {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.heap[index].priority >= this.heap[parentIndex].priority) break;
      [this.heap[index], this.heap[parentIndex]] = [this.heap[parentIndex], this.heap[index]];
      index = parentIndex;
    }
  }

  private sinkDown(index: number) {
    const length = this.heap.length;
    const element = this.heap[index];

    while (true) {
      const leftChildIndex = 2 * index + 1;
      const rightChildIndex = 2 * index + 2;
      let leftChild, rightChild;
      let swap: number | null = null;

      if (leftChildIndex < length) {
        leftChild = this.heap[leftChildIndex];
        if (leftChild.priority < element.priority) swap = leftChildIndex;
      }

      if (rightChildIndex < length) {
        rightChild = this.heap[rightChildIndex];
        if (
          (swap === null && rightChild.priority < element.priority) ||
          (swap !== null && leftChild && rightChild.priority < leftChild.priority)
        ) {
          swap = rightChildIndex;
        }
      }

      if (swap === null) break;
      this.heap[index] = this.heap[swap];
      this.heap[swap] = element;
      index = swap;
    }
  }
}

function dijkstra(nodesById: Record<string, NodeLike>, startId: string, endId: string) {
  const distances: Record<string, number> = {};
  const previous: Record<string, string | null> = {};
  const pq = new PriorityQueue();
  const path: string[] = [];

  for (const id of Object.keys(nodesById)) {
    distances[id] = id === startId ? 0 : Infinity;
    previous[id] = null;
  }

  pq.push(startId, 0);

  while (!pq.isEmpty()) {
    const current = pq.pop()!;
    const smallest = current.node;
    const currentPriority = current.priority;

    if (currentPriority > distances[smallest]) continue;

    if (smallest === endId) {
      let curr: string | null = smallest;
      while (curr !== null && previous[curr] !== null) {
        path.push(curr);
        curr = previous[curr];
      }
      break;
    }

    if (smallest && distances[smallest] !== Infinity) {
      const neighbors = nodesById[smallest]?.adjacencyList ?? [];

      for (const edge of neighbors) {
        const nextNeighbor = edge.node;
        if (!(nextNeighbor in distances)) continue; // ignore dangling references
        const candidate = distances[smallest] + edge.weight;

        if (candidate < distances[nextNeighbor]) {
          distances[nextNeighbor] = candidate;
          previous[nextNeighbor] = smallest;
          pq.push(nextNeighbor, candidate);
        }
      }
    }
  }

  const hasPath = distances[endId] !== undefined && distances[endId] !== Infinity;

  return {
    distances,
    path: hasPath ? path.concat(startId).reverse() : null,
  };
}

/**
 * Computes the shortest path between two nodes in a building, split per
 * floor so the frontend can render one polyline per floor image and offer
 * "next floor / previous floor" navigation whenever the path crosses a
 * bridge/stair connection (an edge between two nodes on different floors).
 */
export function findPath(building: BuildingLike, startId: string, endId: string): PathResult {
  const nodesById: Record<string, NodeLike> = {};
  for (const node of building.nodes) {
    nodesById[String(node._id)] = node;
  }

  if (!nodesById[startId] || !nodesById[endId]) {
    return { distance: null, reachable: false, floors: [] };
  }

  const dij = dijkstra(nodesById, startId, endId);

  if (!dij.path) {
    return { distance: null, reachable: false, floors: [] };
  }

  const floors: FloorSegment[] = [];
  let curFloor = nodesById[startId].floorId;
  let curPoints: PathPoint[] = [];

  for (const nodeId of dij.path) {
    const node = nodesById[nodeId];
    if (node.floorId !== curFloor) {
      floors.push({ floorId: curFloor, points: curPoints });
      curPoints = [];
      curFloor = node.floorId;
    }
    curPoints.push({ nodeId, name: node.name, x: node.x, y: node.y });
  }
  floors.push({ floorId: curFloor, points: curPoints });

  return { distance: dij.distances[endId], reachable: true, floors };
}

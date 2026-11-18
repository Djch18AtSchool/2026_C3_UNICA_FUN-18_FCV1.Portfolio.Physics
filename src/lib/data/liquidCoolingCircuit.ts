import {
  branchFlows,
  circuitProfile,
  powerLawCurve,
  seriesLoss,
  type BranchFlowsResult,
  type Fluid,
  type LossCurve,
  type ProfilePoint,
  type ReturnLayout,
  type Segment,
} from '../physics/hydraulics';
import {
  EPANET_VALUES,
  GF_PUBLISHED,
  MGX_MANIFOLD,
  PG25_40C,
  RD109,
  UQD04,
  type Provenance,
} from './liquidCooling';

/*
 * Tema 13 circuit: the RD109 path from the CDU to one server and back, the parallel branch of a
 * server and its split over the MGX manifold, built from the sourced values of liquidCooling.ts
 * (research docs/superpowers/research/2026-11-17-enfriamiento-liquido.md, §7.1–§7.2), and the two
 * presets of the lab.
 */

/** What sizes one rack's circuit; every preset says where each field comes from. */
export interface RackConfig {
  /** Racks on the CDU: the main pipe carries all of them. */
  racks: number;
  /** Servers on the manifold, one per port. */
  servers: number;
  /** Flow into the rack (m³/s). */
  rackFlow: number;
  serverHoseDiameter: number;
  layout: ReturnLayout;
  /** Server flow (m³/s) at which the cold plate drops RD109.plateDrop. */
  plateDesignFlow: number;
  /** Absolute pressure at the CDU outlet (Pa). */
  inletPressure: number;
}

export interface CoolingPreset extends RackConfig {
  id: 'referencia24' | 'mgx44';
  label: string;
  provenance: Readonly<Record<keyof RackConfig, Provenance>>;
}

/** Mean flow per server (m³/s). */
export function serverFlow(config: RackConfig): number {
  return config.rackFlow / config.servers;
}

const PLASTIC = EPANET_VALUES.roughnessPlastic.value;
const STEEL = EPANET_VALUES.roughnessSteel.value;
const TEE_K = EPANET_VALUES.teeK.value;
const PITCH = MGX_MANIFOLD.portPitch.value;
type Direction = 'ida' | 'vuelta';

/** One piece of the MGX manifold between two ports, rising one pitch (the split's header). */
export const MANIFOLD_PIECE: Segment = {
  id: 'manifold',
  label: 'Tramo de manifold',
  length: PITCH,
  diameter: MGX_MANIFOLD.hydraulicDiameter.value,
  area: MGX_MANIFOLD.innerArea.value,
  roughness: STEEL,
  dy: PITCH,
};

const manifoldPiece = (id: string, label: string, servers: number, dy: number): Segment => ({
  ...MANIFOLD_PIECE,
  id,
  label,
  dy,
  flowMultiple: servers,
});

function mainPipe(direction: Direction, config: RackConfig): Segment {
  return {
    id: `tuberia-${direction}`,
    label: `Tubería principal (${direction})`,
    length: RD109.mainPipeLength.value,
    diameter: RD109.mainPipeDiameter.value,
    roughness: PLASTIC,
    dy: 0,
    flowMultiple: config.racks * config.servers,
  };
}

function rackHose(direction: Direction, config: RackConfig, dy: number): Segment {
  return {
    id: `manguera-rack-${direction}`,
    label: `Te y manguera de rack (${direction})`,
    length: RD109.rackHoseLength.value,
    diameter: RD109.rackHoseDiameter.value,
    roughness: PLASTIC,
    dy,
    K: TEE_K,
    flowMultiple: config.servers,
  };
}

/** The parallel branch of one server, port to port: tee and hose, UQD04, cold plate and back. */
export function serverBranch(config: RackConfig): Segment[] {
  const hose = (direction: Direction): Segment => ({
    id: `manguera-servidor-${direction}`,
    label: `Te y manguera del servidor (${direction})`,
    length: RD109.serverHoseLength.value,
    diameter: config.serverHoseDiameter,
    roughness: PLASTIC,
    dy: 0,
    K: TEE_K,
  });
  const uqd = (direction: Direction): Segment => ({
    id: `uqd-${direction}`,
    label: `UQD04 (${direction})`,
    length: UQD04.drawnLength.value,
    diameter: UQD04.bore.value,
    roughness: STEEL,
    dy: 0,
    cv: UQD04.cv.value,
  });
  const plate: Segment = {
    id: 'placa-fria',
    label: 'Placa fría y tubería interna',
    length: RD109.plateLength.value,
    diameter: config.serverHoseDiameter,
    roughness: PLASTIC,
    dy: 0,
    curve: powerLawCurve(RD109.plateDrop.value, config.plateDesignFlow, RD109.plateExponent.value),
  };
  return [hose('ida'), uqd('ida'), plate, uqd('vuelta'), hose('vuelta')];
}

const ports = (from: number, to: number) =>
  Array.from({ length: Math.abs(to - from) + 1 }, (_, i) => (to >= from ? from + i : from - i));

/**
 * The path CDU → main pipe → rack hose → supply manifold up to `server` (1 = bottom) → branch →
 * return manifold → rack hose → main pipe → CDU (research §7.1). Each segment's flowMultiple
 * counts the servers whose flow it carries, so the path flow is one server's mean flow. Direct
 * return goes back down to the outlet below port 1; reverse return climbs to the outlet above
 * port N and the rack hose brings it down.
 */
export function rackPath(config: RackConfig, server = config.servers): Segment[] {
  const n = config.servers;
  if (!Number.isInteger(server) || server < 1 || server > n) {
    throw new RangeError(`server must be an integer between 1 and ${n}, got ${server}`);
  }
  const supply = ports(1, server).map((j) =>
    manifoldPiece(`manifold-ida-${j}`, 'Manifold de impulsión', n - j + 1, PITCH),
  );
  const isDirect = config.layout === 'directo';
  const back = isDirect
    ? ports(server, 1).map((p) =>
        manifoldPiece(`manifold-vuelta-${p}`, 'Manifold de retorno', n - p + 1, -PITCH),
      )
    : ports(server, n).map((p) =>
        manifoldPiece(`manifold-vuelta-${p}`, 'Manifold de retorno', p, PITCH),
      );
  const outletHeight = isDirect ? 0 : (n + 1) * PITCH;
  return [
    mainPipe('ida', config),
    rackHose('ida', config, 0),
    ...supply,
    ...serverBranch(config),
    ...back,
    rackHose('vuelta', config, -outletHeight),
    mainPipe('vuelta', config),
  ];
}

/** The branch as one curve: its loss at the mean server flow, with the cold plate's exponent. */
export function branchCurve(config: RackConfig, f: Fluid = PG25_40C): LossCurve {
  const q = serverFlow(config);
  return powerLawCurve(seriesLoss(serverBranch(config), q, f), q, RD109.plateExponent.value);
}

/**
 * Per-server flows of the rack (branchFlows over the MGX manifold). Throws a RangeError for a rack
 * flow that is not positive (rackFlow: 0 has no branch curve); the lab guards it before calling.
 */
export function rackSplit(config: RackConfig, f: Fluid = PG25_40C): BranchFlowsResult {
  return branchFlows({
    Qrack: config.rackFlow,
    branchCurve: branchCurve(config, f),
    header: MANIFOLD_PIECE,
    ports: config.servers,
    layout: config.layout,
    f,
  });
}

/**
 * v(x) and p(x) along the path to `server`, at the mean server flow. Throws a RangeError for a rack
 * flow that is not positive (circuitProfile needs a positive path flow); the lab guards it.
 */
export function rackProfile(
  config: RackConfig,
  server = config.servers,
  f: Fluid = PG25_40C,
): ProfilePoint[] {
  return circuitProfile(rackPath(config, server), serverFlow(config), f, config.inletPressure);
}

const provenanceOf = ({ origin, source }: Provenance): Provenance => ({ origin, source });
const REFERENCE_RACK_FLOW = RD109.cduFlow.value / RD109.racks.value;
const MGX_RACK_FLOW = GF_PUBLISHED.cfdManifoldFlow.value;
const DIRECT_RETURN: Provenance = {
  origin: 'ilustrativo',
  source: 'Supuesto: retorno directo, con la entrada y la salida abajo',
};

export const PRESETS: Readonly<Record<CoolingPreset['id'], CoolingPreset>> = {
  referencia24: {
    id: 'referencia24',
    label: 'Referencia: 24 servidores (RD109)',
    racks: RD109.racks.value,
    servers: RD109.servers.value,
    rackFlow: REFERENCE_RACK_FLOW,
    serverHoseDiameter: RD109.serverHoseDiameter.value,
    layout: 'directo',
    plateDesignFlow: REFERENCE_RACK_FLOW / RD109.servers.value,
    inletPressure: RD109.inletPressure.value,
    provenance: {
      racks: provenanceOf(RD109.racks),
      servers: provenanceOf(RD109.servers),
      rackFlow: {
        origin: 'calculo',
        source: 'Cálculo propio: los 23 L/s por CDU de GF entre sus 8 racks',
      },
      serverHoseDiameter: provenanceOf(RD109.serverHoseDiameter),
      layout: DIRECT_RETURN,
      plateDesignFlow: {
        origin: 'ilustrativo',
        source:
          'Supuesto: la placa pierde los 1,2 bar de GF al caudal medio por servidor; GF no da el caudal de ese valor',
      },
      inletPressure: provenanceOf(RD109.inletPressure),
    },
  },
  mgx44: {
    id: 'mgx44',
    label: 'MGX: 44 puertos',
    racks: RD109.racks.value,
    servers: MGX_MANIFOLD.ports.value,
    rackFlow: MGX_RACK_FLOW,
    serverHoseDiameter: RD109.serverHoseDiameter.value,
    layout: 'directo',
    plateDesignFlow: MGX_RACK_FLOW / MGX_MANIFOLD.ports.value,
    inletPressure: RD109.inletPressure.value,
    provenance: {
      racks: {
        origin: 'ilustrativo',
        source: 'Supuesto: el mismo CDU de 8 racks que la referencia',
      },
      servers: provenanceOf(MGX_MANIFOLD.ports),
      rackFlow: provenanceOf(GF_PUBLISHED.cfdManifoldFlow),
      serverHoseDiameter: provenanceOf(RD109.serverHoseDiameter),
      layout: DIRECT_RETURN,
      plateDesignFlow: {
        origin: 'ilustrativo',
        source:
          'Supuesto: la placa pierde los 1,2 bar de GF al caudal medio de este preset; GF no da el caudal de ese valor',
      },
      inletPressure: provenanceOf(RD109.inletPressure),
    },
  },
};

/** The research §7.1 reference: the path to the farthest server (24th, top), direct return. */
export const RD109_CIRCUIT: readonly Segment[] = rackPath(PRESETS.referencia24);

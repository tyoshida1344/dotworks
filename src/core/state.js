import { reactive } from 'vue'
import { PAL } from './palette.js'

export const S = reactive({
  cols: 32,
  rows: 32,
  cell: 16,
  pixels: new Array(1024).fill(null),
  tool: 'pencil',
  color: '#f0a030',
  sym: false,
  palette: [...PAL.pico8],
  headUnits: 0,
  vDivUnits: 0,
  refImg: null,
  overlay: 0.30,
  outlineColor: '#000000',
  undo: [],            // pixels[][] — 最大60手
  redo: [],
})

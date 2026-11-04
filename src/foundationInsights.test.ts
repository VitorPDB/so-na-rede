import test from 'node:test';
import assert from 'node:assert/strict';
import { criterionDistribution, criteriaPublication, distributionFromCube } from './criteriaStats';
import { normalAssessment } from './assessment';
import type { SkillEvent } from './model';
test('qualidade entregue preserva afastada antiga, prioriza detalhe novo e exclui ausentes', () => {
  const events: SkillEvent[] = [
    { skill: 'set', playerId: 'p', result: 'simple_good', assessment: { ...normalAssessment(), criteria: { setPlacement: 'away' } } },
    { skill: 'set', playerId: 'p', result: 'simple_good', assessment: { ...normalAssessment(), criteria: { incomingSet: 'short', setPlacement: 'away' } } },
    { skill: 'set', playerId: 'p', result: 'simple_good' },
  ];
  const before = JSON.stringify(events);
  const data = criterionDistribution(events, 'incomingSet');
  assert.equal(data.known, 2);
  assert.equal(data.missing, 1);
  assert.equal(data.rows.find(r => r.id === 'short')?.percent, 50);
  assert.equal(data.rows.find(r => r.id === 'away')?.count, 1);
  assert.deepEqual(distributionFromCube(criteriaPublication(events, ['p']).team, 'incomingSet', 'set'), data);
  assert.equal(JSON.stringify(events), before);
});
test('publicação antiga mostra qualidade ausente em vez de zero participações', () => {
  const data = distributionFromCube([{skill:'set', key:'difficulty', total:8, rows:[]}], 'incomingSet', 'set');
  assert.equal(data.total, 8);
  assert.equal(data.known, 0);
  assert.equal(data.missing, 8);
});

const test = require('node:test');
const assert = require('node:assert/strict');
const { score } = require('../src/services/matcher');

const user = {
  country: 'Nigeria',
  nationality: 'Nigerian',
  profile: {
    desiredTitles: ['Software Engineering'],
    skills: ['Software Engineering', 'Web Development'],
    workModes: ['remote'],
    locations: [],
  },
};

test('matches Software Engineering preferences to Software Engineer roles', () => {
  const result = score(user, {
    title: 'Principal Software Engineer, Control Plane',
    isRemote: true,
    location: 'Worldwide',
  });

  assert.ok(result >= 55);
});

test('accepts remote jobs tagged Remote or with a Nigerian city', () => {
  for (const location of ['Remote', 'Lagos']) {
    assert.ok(score(user, {
      title: 'Senior Software Engineer',
      isRemote: true,
      location,
    }) >= 55, `expected "${location}" job to match`);
  }
});

test('continues to reject unrelated roles and explicitly foreign remote locations', () => {
  assert.equal(score(user, {
    title: 'Security Analyst',
    isRemote: true,
    location: 'Worldwide',
  }), 0);

  assert.equal(score(user, {
    title: 'Software Engineer',
    isRemote: true,
    location: 'Remote - United States',
  }), 0);
});

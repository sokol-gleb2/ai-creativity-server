/**
 * @param { import('knex').Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  return knex.schema.createTable('persons', (table) => {
    table.increments('id').primary();
    table.string('name');
    table.string('institution');
    table.string('email');
    table.string('website');
    table.text('interests');
    table.text('bio');
    table.string('headshot');
    table.boolean('is_approved').defaultTo(true);
    table.timestamps(true, true);
  });
}

/**
 * @param { import('knex').Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  return knex.schema.dropTableIfExists('persons');
}

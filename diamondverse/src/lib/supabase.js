import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export const PASSWORD = 'DrakeDiamond2026'
export const AUTH_KEY = 'dv_auth'

export const PUSH_OPTIONS = [
  'Main Event','Upper Midcard','Midcard','Lower Midcard',
  'Enhancement Talent','Announcer','Referee','Personality','Staff'
]

export const DISPOSITION_OPTIONS = ['Babyface','Heel','Neutral / N/A']
export const STATUS_OPTIONS = ['Active','Retired','Deceased']
export const GENDER_OPTIONS = ['Male','Female','Non-Binary / Other']
export const COMPANY_SIZE_OPTIONS = ['Global','Large','Medium','Small','Local','Insignificant']
export const TITLE_LEVEL_OPTIONS = ['Primary','Secondary','Tertiary']
export const TITLE_TYPE_OPTIONS = ['Singles','Tag','Trios']
export const EVENT_INTENT_OPTIONS = ['Season Finale','Special','Regular','Weekly TV']

export const COUNTRIES = [
  'Afghanistan','Albania','Algeria','Andorra','Angola','Antigua and Barbuda','Argentina','Armenia',
  'Australia','Austria','Azerbaijan','Bahamas','Bahrain','Bangladesh','Barbados','Belarus','Belgium',
  'Belize','Benin','Bhutan','Bolivia','Bosnia and Herzegovina','Botswana','Brazil','Brunei',
  'Bulgaria','Burkina Faso','Burundi','Cabo Verde','Cambodia','Cameroon','Canada',
  'Central African Republic','Chad','Chile','China','Colombia','Comoros','Congo',
  'Costa Rica','Croatia','Cuba','Cyprus','Czech Republic','Democratic Republic of the Congo',
  'Denmark','Djibouti','Dominica','Dominican Republic','Ecuador','Egypt','El Salvador',
  'Equatorial Guinea','Eritrea','Estonia','Eswatini','Ethiopia','Fiji','Finland','France',
  'Gabon','Gambia','Georgia','Germany','Ghana','Greece','Grenada','Guatemala','Guinea',
  'Guinea-Bissau','Guyana','Haiti','Honduras','Hungary','Iceland','India','Indonesia','Iran',
  'Iraq','Ireland','Israel','Italy','Jamaica','Japan','Jordan','Kazakhstan','Kenya','Kiribati',
  'Kuwait','Kyrgyzstan','Laos','Latvia','Lebanon','Lesotho','Liberia','Libya','Liechtenstein',
  'Lithuania','Luxembourg','Madagascar','Malawi','Malaysia','Maldives','Mali','Malta',
  'Marshall Islands','Mauritania','Mauritius','Mexico','Micronesia','Moldova','Monaco',
  'Mongolia','Montenegro','Morocco','Mozambique','Myanmar','Namibia','Nauru','Nepal',
  'Netherlands','New Zealand','Nicaragua','Niger','Nigeria','North Korea','North Macedonia',
  'Norway','Oman','Pakistan','Palau','Palestine','Panama','Papua New Guinea','Paraguay','Peru',
  'Philippines','Poland','Portugal','Qatar','Romania','Russia','Rwanda','Saint Kitts and Nevis',
  'Saint Lucia','Saint Vincent and the Grenadines','Samoa','San Marino','Sao Tome and Principe',
  'Saudi Arabia','Senegal','Serbia','Seychelles','Sierra Leone','Singapore','Slovakia','Slovenia',
  'Solomon Islands','Somalia','South Africa','South Korea','South Sudan','Spain','Sri Lanka',
  'Sudan','Suriname','Sweden','Switzerland','Syria','Taiwan','Tajikistan','Tanzania','Thailand',
  'Timor-Leste','Togo','Tonga','Trinidad and Tobago','Tunisia','Turkey','Turkmenistan','Tuvalu',
  'Uganda','Ukraine','United Arab Emirates','United Kingdom','United States','Uruguay','Uzbekistan',
  'Vanuatu','Vatican City','Venezuela','Vietnam','Yemen','Zambia','Zimbabwe'
]

export function getPushColor(push) {
  const map = {
    'Main Event': 'badge-gold',
    'Upper Midcard': 'badge-blue',
    'Midcard': 'badge-gray',
    'Lower Midcard': 'badge-gray',
    'Enhancement Talent': 'badge-gray',
    'Announcer': 'badge-purple',
    'Referee': 'badge-purple',
    'Personality': 'badge-purple',
    'Staff': 'badge-gray',
  }
  return map[push] || 'badge-gray'
}

export function getWeightLabel(weight, gender) {
  if (gender === 'Female') {
    if (weight < 140) return { label: 'Lightweight', cls: 'weight-female-light' }
    if (weight <= 180) return { label: 'Middleweight', cls: 'weight-female-mid' }
    return { label: 'Powerhouse', cls: 'weight-female-power' }
  }
  if (weight < 215) return { label: 'Cruiserweight', cls: 'weight-cruiser' }
  if (weight <= 299) return { label: 'Heavyweight', cls: 'weight-heavy' }
  if (weight <= 399) return { label: 'Super Heavyweight', cls: 'weight-super-heavy' }
  return { label: 'Giant', cls: 'weight-giant' }
}

export function calcAge(dob, referenceDate) {
  if (!dob) return null
  const ref = referenceDate ? new Date(referenceDate) : new Date()
  const birth = new Date(dob)
  let age = ref.getFullYear() - birth.getFullYear()
  const m = ref.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && ref.getDate() < birth.getDate())) age--
  return age
}

export function formatHeight(ft, inches) {
  return `${ft}'${String(inches).padStart(2,'0')}"`
}

export async function logChange(entityType, entityId, entityName, action, previousData, newData) {
  const changedFields = []
  if (previousData && newData) {
    for (const key of Object.keys(newData)) {
      if (JSON.stringify(previousData[key]) !== JSON.stringify(newData[key])) {
        changedFields.push(key)
      }
    }
  }
  await supabase.from('change_log').insert({
    entity_type: entityType, entity_id: entityId, entity_name: entityName,
    action, previous_data: previousData, new_data: newData, changed_fields: changedFields
  })
}

export function randomDOB(minAge = 18, maxAge = 55) {
  const now = new Date()
  const minYear = now.getFullYear() - maxAge
  const maxYear = now.getFullYear() - minAge
  const year = minYear + Math.floor(Math.random() * (maxYear - minYear + 1))
  const month = Math.floor(Math.random() * 12) + 1
  const day = Math.floor(Math.random() * 28) + 1
  return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`
}

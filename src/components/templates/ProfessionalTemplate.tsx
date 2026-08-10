import React from 'react';
import { ResumeData, TemplateProps } from '../../types';
import InlineEdit from '../InlineEdit';
import IconDisplay from '../IconDisplay';
import { readableAccent } from '../../utils/templateInk';

export const ProfessionalTemplate: React.FC<TemplateProps> = ({ resume, themeColor, titleFont, bodyFont, onFocus }) => {
  const { personalDetails, professionalSummary, employmentHistory, education, skills, websites, sectionTitles, customIcons } = resume;

  const titleStyle = { fontFamily: `'${titleFont}', sans-serif` };
  const bodyStyle = { fontFamily: `'${bodyFont}', sans-serif` };
  const themeColorStyle = { color: readableAccent(themeColor) };

  return (
    <div className="p-8 bg-white text-gray-800" style={bodyStyle}>
      <header className="flex items-center mb-8">
        {personalDetails.photo && (
          <div className="w-24 h-24 rounded-full mr-6 shrink-0 overflow-hidden flex items-center justify-center">
            <img src={personalDetails.photo} alt="Profile" className="w-full h-full object-cover" />
          </div>
        )}
        <div>
          <div className="flex gap-2 items-end">
            <InlineEdit
              value={personalDetails.firstName}
              fieldId="personalDetails.firstName"
              onFocus={onFocus}
              className="text-4xl font-bold text-gray-900"
              style={titleStyle}
              tagName="h1"
              placeholder="First Name"
            />
            <InlineEdit
              value={personalDetails.lastName}
              fieldId="personalDetails.lastName"
              onFocus={onFocus}
              className="text-4xl font-bold text-gray-900"
              style={titleStyle}
              tagName="h1"
              placeholder="Last Name"
            />
          </div>
          <InlineEdit
            value={personalDetails.jobTitle}
            fieldId="personalDetails.jobTitle"
            onFocus={onFocus}
            className="text-xl font-medium mt-1 block"
            style={{ ...titleStyle, ...themeColorStyle }}
            tagName="h2"
            placeholder="Job Title"
          />
        </div>
      </header>

      <div className="grid grid-cols-12 gap-8">
        <main className="col-span-8">
          <section className="mb-6">
            <h3 className="text-lg font-bold text-gray-800 border-b-2 border-gray-200 pb-2 mb-3 uppercase" style={titleStyle}>
              <InlineEdit value={sectionTitles?.profile || 'Professional Summary'} fieldId="sectionTitles.profile" onFocus={onFocus} placeholder="Summary" />
            </h3>
            <InlineEdit
              value={professionalSummary}
              fieldId="professionalSummary"
              onFocus={onFocus}
              className="text-sm leading-relaxed block whitespace-pre-wrap"
              tagName="p"
              placeholder="Professional Summary..."
            />
          </section>

          <section className="mb-6">
            <h3 className="text-lg font-bold text-gray-800 border-b-2 border-gray-200 pb-2 mb-3 uppercase" style={titleStyle}>
              <InlineEdit value={sectionTitles?.experience || 'Work Experience'} fieldId="sectionTitles.experience" onFocus={onFocus} placeholder="Experience" />
            </h3>
            {employmentHistory.map((job, index) => (
              <div key={job.id || `job-${index}`} className="mb-4">
                <div className="flex justify-between items-baseline">
                  <InlineEdit
                    value={job.jobTitle}
                    fieldId={`employmentHistory[${index}].jobTitle`}
                    onFocus={onFocus}
                    className="text-md font-bold block"
                    style={titleStyle}
                    tagName="h4"
                    placeholder="Job Title"
                  />
                  <div className="flex gap-1 text-sm text-gray-600">
                    <InlineEdit value={job.startDate} fieldId={`employmentHistory[${index}].startDate`} onFocus={onFocus} placeholder="Start" />
                    <span>-</span>
                    <InlineEdit value={job.endDate} fieldId={`employmentHistory[${index}].endDate`} onFocus={onFocus} placeholder="End" />
                  </div>
                </div>
                <div className="flex gap-1 text-sm font-medium text-gray-700">
                  <InlineEdit value={job.employer} fieldId={`employmentHistory[${index}].employer`} onFocus={onFocus} placeholder="Employer" />
                  <span>,</span>
                  <InlineEdit value={job.city} fieldId={`employmentHistory[${index}].city`} onFocus={onFocus} placeholder="City" />
                </div>
                <InlineEdit
                  value={job.description}
                  fieldId={`employmentHistory[${index}].description`}
                  onFocus={onFocus}
                  className="text-sm mt-2 leading-relaxed whitespace-pre-wrap block"
                  tagName="p"
                  placeholder="Description..."
                />
              </div>
            ))}
          </section>
        </main>

        <aside className="col-span-4">
          <section className="mb-6">
            <h3 className="text-lg font-bold text-gray-800 border-b-2 border-gray-200 pb-2 mb-3 uppercase" style={titleStyle}>
              <InlineEdit value={sectionTitles?.contact || 'Contact'} fieldId="sectionTitles.contact" onFocus={onFocus} placeholder="Contact" />
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center">
                <IconDisplay iconName={customIcons?.email || 'mail'} size={14} className="mr-3 flex-shrink-0 transform translate-y-px" style={themeColorStyle} />
                <InlineEdit value={personalDetails.email} fieldId="personalDetails.email" onFocus={onFocus} placeholder="Email" />
              </div>
              <div className="flex items-center">
                <IconDisplay iconName={customIcons?.phone || 'phone'} size={14} className="mr-3 flex-shrink-0 transform translate-y-px" style={themeColorStyle} />
                <InlineEdit value={personalDetails.phone} fieldId="personalDetails.phone" onFocus={onFocus} placeholder="Phone" />
              </div>
              <div className="flex items-center">
                <IconDisplay iconName={customIcons?.location || 'map-pin'} size={14} className="mr-3 flex-shrink-0 transform translate-y-px" style={themeColorStyle} />
                <InlineEdit value={personalDetails.address} fieldId="personalDetails.address" onFocus={onFocus} placeholder="Address" />
              </div>
              {websites.map((site, index) => (
                <div key={site.id || `site-${index}`} className="flex items-center">
                  <IconDisplay iconName={site.icon || 'globe'} size={14} className="mr-3 flex-shrink-0 transform translate-y-px" style={themeColorStyle} />
                  <a href={site.url} target="_blank" rel="noopener noreferrer" className="hover:underline break-all">
                    <InlineEdit value={site.label} fieldId={`websites[${index}].label`} onFocus={onFocus} isLink />
                    {site.showUrl && <span className="text-gray-600 text-xs ml-1 block">{site.url}</span>}
                  </a>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-6">
            <h3 className="text-lg font-bold text-gray-800 border-b-2 border-gray-200 pb-2 mb-3 uppercase" style={titleStyle}>
              <InlineEdit value={sectionTitles?.skills || 'Skills'} fieldId="sectionTitles.skills" onFocus={onFocus} placeholder="Skills" />
            </h3>
            <ul className="space-y-1">
              {skills.map((skill, index) => (
                <li key={skill.id || `skill-${index}`} className="text-sm bg-gray-100 rounded-md px-3 py-1 flex items-center">
                  <InlineEdit value={skill.name} fieldId={`skills[${index}].name`} onFocus={onFocus} placeholder="Skill" />
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-bold text-gray-800 border-b-2 border-gray-200 pb-2 mb-3 uppercase" style={titleStyle}>
              <InlineEdit value={sectionTitles?.education || 'Education'} fieldId="sectionTitles.education" onFocus={onFocus} placeholder="Education" />
            </h3>
            {education.map((edu, index) => (
              <div key={edu.id || `edu-${index}`} className="mb-4">
                <InlineEdit
                  value={edu.degree}
                  fieldId={`education[${index}].degree`}
                  onFocus={onFocus}
                  className="text-md font-bold block"
                  style={titleStyle}
                  tagName="h4"
                  placeholder="Degree"
                />
                <InlineEdit
                  value={edu.school}
                  fieldId={`education[${index}].school`}
                  onFocus={onFocus}
                  className="text-sm font-medium block"
                  tagName="p"
                  placeholder="School"
                />
                <div className="flex gap-1 text-sm text-gray-600">
                  <InlineEdit value={edu.startDate} fieldId={`education[${index}].startDate`} onFocus={onFocus} placeholder="Start" />
                  <span>-</span>
                  <InlineEdit value={edu.endDate} fieldId={`education[${index}].endDate`} onFocus={onFocus} placeholder="End" />
                </div>
              </div>
            ))}
          </section>
        </aside>
      </div>
    </div>
  );
};